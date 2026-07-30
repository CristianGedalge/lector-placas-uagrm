from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import ClassVar
from uuid import UUID

from app.services.vehicle_detection import VehicleAssociation


@dataclass(frozen=True)
class VehicleTypeResult:
    tipo_sugerido_id: UUID | None
    confianza_tipo: float
    metodo_tipo: str


class VehicleTypeSuggester:
    ALIASES: ClassVar[dict[str, set[str]]] = {
        "car": {"AUTOMOVIL", "AUTO", "COCHE", "VEHICULO LIVIANO"},
        "motorcycle": {"MOTOCICLETA", "MOTO", "SCOOTER"},
        "bus": {"BUS", "AUTOBUS"},
        "truck": {"CAMION", "VEHICULO PESADO"},
    }
    MIN_CONFIDENCE = 0.62

    @classmethod
    def resolve(cls, association: VehicleAssociation | None, catalog) -> VehicleTypeResult:
        if association is None:
            return VehicleTypeResult(None, 0.0, "DESCONOCIDO")
        final_confidence = float(
            0.55 * association.detector_confidence
            + 0.30 * association.association_quality
            + 0.15 * association.visual_quality
        )
        aliases = cls.ALIASES.get(association.label, set())
        matches = [item for item in catalog if getattr(item, "esta_activo", True)
                   and cls.normalize(item.nombre) in aliases]
        if final_confidence < cls.MIN_CONFIDENCE or len(matches) != 1:
            return VehicleTypeResult(None, round(final_confidence, 4), "DESCONOCIDO")
        return VehicleTypeResult(matches[0].id, round(final_confidence, 4), "RF_DETR")

    @staticmethod
    def normalize(value: str) -> str:
        decomposed = unicodedata.normalize("NFKD", value or "")
        return " ".join("".join(ch for ch in decomposed if not unicodedata.combining(ch)).upper().split())
