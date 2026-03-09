"""rename lesson problems and mental_models

Revision ID: 0be6f42849c5
Revises: 6960c3b1d222
Create Date: 2026-03-09 19:16:52.049575

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0be6f42849c5'
down_revision: Union[str, None] = '6960c3b1d222'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():

    op.alter_column(
        "lessons",
        "problems",
        new_column_name="what_it_solves"
    )

    op.alter_column(
        "lessons",
        "mental_models",
        new_column_name="conceptual_understanding"
    )


def downgrade():

    op.alter_column(
        "lessons",
        "what_it_solves",
        new_column_name="problems"
    )

    op.alter_column(
        "lessons",
        "conceptual_understanding",
        new_column_name="mental_models"
    )