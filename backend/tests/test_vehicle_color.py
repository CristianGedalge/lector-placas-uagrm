import cv2
import numpy as np
import pytest
from app.services.vehicle_color import VehicleColorAnalyzer

PLATE_BOX = [270, 235, 370, 270]
VEHICLE_BOX = [80, 45, 560, 325]


def vehicle_image(body_bgr, accent_bgr=None, background=(205, 205, 205), reflections=False):
    image = np.full((370, 640, 3), background, dtype=np.uint8)
    # Silueta de carroceria amplia.
    cv2.rectangle(image, (80, 45), (560, 325), body_bgr, -1)
    # Ventana, parrilla, ruedas y placa: elementos que no deben convertirse en color secundario.
    cv2.rectangle(image, (210, 90), (430, 165), (18, 18, 18), -1)
    cv2.rectangle(image, (225, 255), (415, 315), (20, 20, 20), -1)
    cv2.circle(image, (155, 300), 48, (16, 16, 16), -1)
    cv2.circle(image, (485, 300), 48, (16, 16, 16), -1)
    cv2.rectangle(image, (270, 235), (370, 270), (242, 242, 242), -1)
    if accent_bgr is not None:
        # Pintura bicolor real: banda continua que cruza varios sectores.
        cv2.rectangle(image, (95, 170), (545, 230), accent_bgr, -1)
    if reflections:
        cv2.rectangle(image, (115, 180), (170, 205), (255, 255, 255), -1)
        cv2.rectangle(image, (440, 190), (525, 212), (255, 255, 255), -1)
    ok, content = cv2.imencode(".jpg", image)
    assert ok
    return content.tobytes()


def camera_like_image(body_bgr, *, highlight_fraction=0.0, bright_floor=False):
    image = np.full((370, 640, 3), (70, 75, 80), dtype=np.uint8)
    if bright_floor:
        image[300:, :] = (250, 250, 250)
    x1, y1, x2, y2 = VEHICLE_BOX
    base = np.asarray(body_bgr, dtype=np.float32)
    gradient = np.linspace(0.82, 1.02, x2 - x1, dtype=np.float32)[None, :, None]
    body = np.clip(base[None, None, :] * gradient, 0, 255)
    body = np.repeat(body, y2 - y1, axis=0).astype(np.uint8)
    image[y1:y2, x1:x2] = body
    cv2.rectangle(image, (210, 90), (430, 165), (20, 24, 28), -1)
    cv2.rectangle(image, (225, 255), (415, 315), (22, 22, 22), -1)
    cv2.circle(image, (155, 300), 48, (15, 15, 15), -1)
    cv2.circle(image, (485, 300), 48, (15, 15, 15), -1)
    cv2.rectangle(image, (270, 235), (370, 270), (242, 242, 242), -1)
    if highlight_fraction:
        highlight_width = int((x2 - x1) * highlight_fraction)
        cv2.rectangle(image, (x1 + 35, 170), (x1 + 35 + highlight_width, 245), (255, 255, 255), -1)
    ok, content = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 88])
    assert ok
    return content.tobytes()


def analyze(content):
    return VehicleColorAnalyzer().analyze(content, PLATE_BOX, VEHICLE_BOX)


def test_white_vehicle_ignores_black_windows_grille_and_tires():
    result = analyze(vehicle_image((235, 235, 235)))
    assert [item["valor"] for item in result] == ["BLANCO"]


def test_black_vehicle_is_not_discarded_as_shadow():
    result = analyze(vehicle_image((34, 34, 34), background=(180, 180, 180)))
    assert result[0]["valor"] == "NEGRO"
    assert result[0]["confianza"] >= 0.40


@pytest.mark.parametrize(
    ("body", "expected"),
    [((105, 105, 105), "GRIS"), ((178, 178, 178), "PLATEADO")],
)
def test_gray_and_silver_are_not_returned_as_two_colors(body, expected):
    result = analyze(vehicle_image(body))
    assert [item["valor"] for item in result] == [expected]


def test_genuinely_two_tone_vehicle_returns_two_colors():
    result = analyze(vehicle_image((35, 40, 205), accent_bgr=(32, 32, 32)))
    assert len(result) == 2
    assert {item["valor"] for item in result} == {"ROJO", "NEGRO"}
    assert result[0]["cobertura"] >= result[1]["cobertura"]


def test_dark_background_does_not_become_second_color():
    result = analyze(vehicle_image((40, 45, 205), background=(15, 15, 15)))
    assert [item["valor"] for item in result] == ["ROJO"]


def test_insufficient_illumination_returns_unknown():
    result = analyze(vehicle_image((10, 10, 10), background=(8, 8, 8)))
    assert result[0]["valor"] == "DESCONOCIDO"


def test_strong_reflections_are_excluded():
    result = analyze(vehicle_image((40, 45, 205), reflections=True))
    assert [item["valor"] for item in result] == ["ROJO"]


def test_dark_gray_with_strong_reflections_is_unknown():
    result = analyze(camera_like_image((82, 84, 86), highlight_fraction=0.45))
    assert result[0]["valor"] == "DESCONOCIDO"


def test_silver_under_direct_light_is_unknown_instead_of_white():
    result = analyze(camera_like_image((165, 168, 172), highlight_fraction=0.38))
    assert result[0]["valor"] == "DESCONOCIDO"


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        ((232, 232, 232), "BLANCO"),
        ((32, 32, 32), "NEGRO"),
        ((175, 82, 32), "AZUL"),
    ],
)
def test_camera_like_stable_vehicle_colors(body, expected):
    result = analyze(camera_like_image(body))
    assert result[0]["valor"] == expected


def test_bright_floor_and_background_do_not_turn_vehicle_white():
    result = analyze(camera_like_image((175, 82, 32), bright_floor=True))
    assert result[0]["valor"] == "AZUL"


def test_missing_bbox_is_unknown():
    result = VehicleColorAnalyzer().analyze(vehicle_image((180, 70, 35)), None)
    assert result == [{"valor": "DESCONOCIDO", "cobertura": 0.0, "confianza": 0.0}]


def test_visible_value_is_derived_in_memory():
    assert VehicleColorAnalyzer.visible_value([
        {"valor": "ROJO", "cobertura": 0.7, "confianza": 0.8},
        {"valor": "NEGRO", "cobertura": 0.2, "confianza": 0.6},
    ]) == "ROJO / NEGRO"


def test_general_confidence_is_weighted_by_coverage():
    suggestions = [
        {"valor": "ROJO", "cobertura": 0.7, "confianza": 0.8},
        {"valor": "NEGRO", "cobertura": 0.2, "confianza": 0.6},
    ]
    expected = (0.8 * 0.7 + 0.6 * 0.2) / 0.9
    assert VehicleColorAnalyzer.average_confidence(suggestions) == pytest.approx(expected)
    assert VehicleColorAnalyzer.average_confidence([
        {"valor": "DESCONOCIDO", "cobertura": 0.0, "confianza": 0.2}
    ]) == 0.0
