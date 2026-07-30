"""seed canonical RF-DETR vehicle types

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a0b1c2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No se insertan UUID fijos. Si ya existe cualquier alias reconocido para
    # una clase RF-DETR, se conserva ese registro para evitar coincidencias
    # múltiples en el catálogo.
    op.execute(
        """
        WITH catalogo(nombre, aliases) AS (
            VALUES
                ('Automóvil', ARRAY['AUTOMOVIL', 'AUTO', 'COCHE', 'VEHICULO LIVIANO']),
                ('Motocicleta', ARRAY['MOTOCICLETA', 'MOTO', 'SCOOTER']),
                ('Bus', ARRAY['BUS', 'AUTOBUS']),
                ('Camión', ARRAY['CAMION', 'VEHICULO PESADO'])
        )
        INSERT INTO tipos_vehiculo (id, nombre, esta_activo, creado_el)
        SELECT gen_random_uuid(), catalogo.nombre, TRUE, timezone('utc', now())
        FROM catalogo
        WHERE NOT EXISTS (
            SELECT 1
            FROM tipos_vehiculo tipo
            WHERE translate(upper(trim(tipo.nombre)), 'ÁÉÍÓÚÜÑ', 'AEIOUUN')
                  = ANY(catalogo.aliases)
        )
        """
    )


def downgrade() -> None:
    # No se eliminan datos de catálogo: después de usarlos pueden estar
    # referenciados por vehículos o solicitudes históricas.
    pass
