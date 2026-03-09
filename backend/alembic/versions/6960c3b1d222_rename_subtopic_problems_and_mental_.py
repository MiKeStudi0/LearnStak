"""rename subtopic problems and mental_models

Revision ID: 6960c3b1d222
Revises: 7e9cb1f162fa
Create Date: 2026-03-09 19:13:31.612910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6960c3b1d222'
down_revision: Union[str, None] = '7e9cb1f162fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():

    op.alter_column(
        "sub_topics",
        "problems",
        new_column_name="what_it_solves"
    )

    op.alter_column(
        "sub_topics",
        "mental_models",
        new_column_name="conceptual_understanding"
    )


def downgrade():

    op.alter_column(
        "sub_topics",
        "what_it_solves",
        new_column_name="problems"
    )

    op.alter_column(
        "sub_topics",
        "conceptual_understanding",
        new_column_name="mental_models"
    )