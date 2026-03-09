"""rename problems and mental_models columns

Revision ID: 7e9cb1f162fa
Revises: 8cf676a39821
Create Date: 2026-03-09 19:06:28.339647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e9cb1f162fa'
down_revision: Union[str, None] = '8cf676a39821'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
from alembic import op


def upgrade():
    op.alter_column(
        "topics",
        "problems",
        new_column_name="what_it_solves"
    )

    op.alter_column(
        "topics",
        "mental_models",
        new_column_name="conceptual_understanding"
    )


def downgrade():
    op.alter_column(
        "topics",
        "what_it_solves",
        new_column_name="problems"
    )

    op.alter_column(
        "topics",
        "conceptual_understanding",
        new_column_name="mental_models"
    )