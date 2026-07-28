from uuid import uuid4

from app.db.models import SolicitudRegistroEstadoEnum
from app.schemas.registration_request import SolicitudRegistroApprove


def test_registration_request_approval_requires_staff_fields():
    payload = SolicitudRegistroApprove(
        propietario_usuario_id=uuid4(),
        marca_id=uuid4(),
        tipo_vehiculo_id=uuid4(),
        color="Rojo",
    )
    assert payload.color == "Rojo"


def test_registration_request_states_are_explicit():
    assert {state.value for state in SolicitudRegistroEstadoEnum} == {"PENDING", "APPROVED", "REJECTED"}
