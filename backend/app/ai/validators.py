import re

# Formato de placas en Bolivia:
# Antiguas: 3 números + 3 letras (ej. 123ABC)
# Nuevas: 4 números + 3 letras (ej. 1234ABC)
PATRON_PLACA_BOLIVIA = re.compile(r"^\d{3,4}[A-Z]{3}$")

# ---------------------------------------------------------------------------
# Blocklist de palabras del entorno de placas bolivianas
# Estas palabras aparecen impresas en la placa o en el fondo de la imagen
# y nunca son un número de placa válido.
# ---------------------------------------------------------------------------
PLATE_BLOCKLIST: frozenset[str] = frozenset(
    {
        "BOLIVIA",   # encabezado estándar de la placa boliviana
        "8011VIA",   # artefacto del corrector OCR sobre "BOLIVIA"
        "POLICIA",
        "TRANSITO",
        "TRANSIT",
        "PLACA",
        "REGISTRO",
    }
)


def is_blocklisted(text: str) -> bool:
    """Devuelve True si el texto es una palabra del entorno, no un número de placa."""
    return text.upper() in PLATE_BLOCKLIST


# ---------------------------------------------------------------------------
# Tablas de corrección OCR posicional — solo las 6 confusiones universales
# ---------------------------------------------------------------------------
# Zona NUMÉRICA (posiciones 0-3): letras que un OCR puede confundir con dígitos.
# IMPORTANTE: solo incluir confusiones donde el carácter visualmente
# se parece al dígito de forma casi universal (O↔0, I↔1, S↔5, Z↔2, G↔6, B↔8, D↔0, Q↔0).
_NUM_ZONE_FIXES: dict[int, str] = {
    ord("O"): "0",  # O → 0  (idénticos en muchas fuentes)
    ord("I"): "1",  # I → 1
    ord("S"): "5",  # S → 5
    ord("Z"): "2",  # Z → 2
    ord("G"): "6",  # G → 6
    ord("B"): "8",  # B → 8
    ord("D"): "0",  # D → 0  (DIN 1451: D con serifa se confunde con 0)
    ord("Q"): "0",  # Q → 0  (Q sin cola puede leerse como 0)
}

# Zona ALFABÉTICA (posiciones 4-6): dígitos que un OCR puede confundir con letras.
_LET_ZONE_FIXES: dict[int, str] = {
    ord("0"): "O",  # 0 → O
    ord("1"): "I",  # 1 → I
    ord("5"): "S",  # 5 → S
    ord("2"): "Z",  # 2 → Z
    ord("6"): "G",  # 6 → G
    ord("8"): "B",  # 8 → B
    ord("4"): "A",  # 4 → A  (en fuente de placa boliviana se confunden)
    ord("3"): "E",  # 3 → E  (3 invertido visual similar a E)
}


def correct_ocr_confusions(normalized: str) -> str:
    """
    Corrección posicional para el formato boliviano NNNNLLL o NNNLLL.

    Posiciones iniciales (zona numérica): convierte letras a dígitos.
    Posiciones finales (zona alfabética): convierte dígitos a letra.
    Para textos de longitudes diferentes, no aplica reglas posicionales estrictas
    para no corromper la lectura.
    """
    if not normalized:
        return normalized
    
    length = len(normalized)
    if length == 7:
        zona_num = normalized[:4].translate(_NUM_ZONE_FIXES)
        zona_let = normalized[4:].translate(_LET_ZONE_FIXES)
        return zona_num + zona_let
    elif length == 6:
        zona_num = normalized[:3].translate(_NUM_ZONE_FIXES)
        zona_let = normalized[3:].translate(_LET_ZONE_FIXES)
        return zona_num + zona_let
        
    return normalized


def normalize_plate_text(raw_text: str) -> str:
    """Limpia, normaliza y aplica corrección posicional OCR al texto de placa."""
    if not raw_text:
        return ""
    clean = re.sub(r"[^A-Z0-9]", "", raw_text.upper())
    return correct_ocr_confusions(clean)


def validate_bolivian_plate(normalized_plate: str) -> bool:
    if not normalized_plate:
        return False
    return bool(PATRON_PLACA_BOLIVIA.fullmatch(normalized_plate))


