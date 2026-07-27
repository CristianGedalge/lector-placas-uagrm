"""Compatibility anchor for a revision already deployed in Neon."""
from typing import Sequence, Union

revision: str = "3aa735770818"
down_revision: Union[str, Sequence[str], None] = "9d8f2a1c4b77"
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
