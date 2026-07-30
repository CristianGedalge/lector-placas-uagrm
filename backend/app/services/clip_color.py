from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

from app.config.settings import BACKEND_DIR, settings


@dataclass(frozen=True)
class CLIPColorResult:
    valor: str
    confianza: float
    segundo_valor: str
    segunda_confianza: float
    margen: float
    confiable: bool


class CLIPColorClassifier:
    """CLIP ViT-B/32 ONNX local limitado al catalogo de colores vehiculares."""

    CATALOG = (
        ("BLANCO", "a photo of a white vehicle"),
        ("NEGRO", "a photo of a black vehicle"),
        ("GRIS", "a photo of a gray vehicle"),
        ("PLATEADO", "a photo of a silver vehicle"),
        ("ROJO", "a photo of a red vehicle"),
        ("AZUL", "a photo of a blue vehicle"),
        ("VERDE", "a photo of a green vehicle"),
        ("AMARILLO", "a photo of a yellow vehicle"),
        ("MARRON", "a photo of a brown vehicle"),
    )
    MODEL_DIR = BACKEND_DIR / ".runtime" / "models" / "clip-vit-b-32"
    TOKENIZER_FILES = (
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "preprocessor_config.json",
        "config.json",
    )

    def __init__(self, model_dir: Path | None = None) -> None:
        self.model_dir = model_dir or self.MODEL_DIR
        self._ensure_files()
        self.session = ort.InferenceSession(
            str(self.model_dir / settings.CLIP_COLOR_MODEL_FILE),
            providers=[settings.FAST_ALPR_EXECUTION_PROVIDER],
        )
        self.tokenizer = Tokenizer.from_file(str(self.model_dir / "tokenizer.json"))
        self.input_ids, self.attention_mask = self._tokenize([prompt for _, prompt in self.CATALOG])

    def classify(self, vehicle_crop: np.ndarray) -> CLIPColorResult:
        pixel_values = self._preprocess(vehicle_crop)
        outputs = self.session.run(
            ["logits_per_image"],
            {
                "input_ids": self.input_ids,
                "attention_mask": self.attention_mask,
                "pixel_values": pixel_values,
            },
        )[0][0]
        probabilities = self._softmax(outputs)
        order = np.argsort(probabilities)[::-1]
        first, second = int(order[0]), int(order[1])
        first_score, second_score = float(probabilities[first]), float(probabilities[second])
        margin = first_score - second_score
        reliable = first_score >= settings.CLIP_COLOR_MIN_SCORE and margin >= settings.CLIP_COLOR_MIN_MARGIN
        calibrated_confidence = float(np.clip(
            0.55 * min(first_score / 0.65, 1.0)
            + 0.45 * min(margin / 0.35, 1.0),
            0.0,
            1.0,
        ))
        return CLIPColorResult(
            valor=self.CATALOG[first][0] if reliable else "DESCONOCIDO",
            confianza=calibrated_confidence,
            segundo_valor=self.CATALOG[second][0],
            segunda_confianza=second_score,
            margen=margin,
            confiable=reliable,
        )

    def _ensure_files(self) -> None:
        files = (settings.CLIP_COLOR_MODEL_FILE, *self.TOKENIZER_FILES)
        for filename in files:
            target = self.model_dir / filename
            if not target.is_file():
                hf_hub_download(
                    repo_id=settings.CLIP_COLOR_REPO,
                    filename=filename,
                    local_dir=self.model_dir,
                )

    def _tokenize(self, prompts: list[str]) -> tuple[np.ndarray, np.ndarray]:
        encoded = self.tokenizer.encode_batch(prompts)
        length = 77
        pad_id = 49407
        ids = np.full((len(encoded), length), pad_id, dtype=np.int64)
        attention = np.zeros((len(encoded), length), dtype=np.int64)
        for row, item in enumerate(encoded):
            values = item.ids[:length]
            ids[row, : len(values)] = values
            attention[row, : len(values)] = 1
        return ids, attention

    @staticmethod
    def _preprocess(image: np.ndarray) -> np.ndarray:
        if image is None or image.size == 0:
            raise ValueError("El recorte vehicular esta vacio")
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        height, width = rgb.shape[:2]
        scale = 224.0 / min(height, width)
        resized = cv2.resize(
            rgb,
            (max(224, round(width * scale)), max(224, round(height * scale))),
            interpolation=cv2.INTER_CUBIC,
        )
        y = (resized.shape[0] - 224) // 2
        x = (resized.shape[1] - 224) // 2
        crop = resized[y : y + 224, x : x + 224].astype(np.float32) / 255.0
        mean = np.asarray([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
        std = np.asarray([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
        crop = (crop - mean) / std
        return np.transpose(crop, (2, 0, 1))[None, ...].astype(np.float32)

    @staticmethod
    def _softmax(values: np.ndarray) -> np.ndarray:
        shifted = values.astype(np.float64) - np.max(values)
        exponentials = np.exp(shifted)
        return exponentials / np.sum(exponentials)
