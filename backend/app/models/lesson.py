from sqlalchemy import Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_mixins import TimestampMixin, OrderableMixin, ActiveMixin


class Lesson(Base, TimestampMixin, OrderableMixin, ActiveMixin):
    __tablename__ = "lessons"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True)

    # Relations
    roadmap_id: Mapped[int] = mapped_column(
        ForeignKey("roadmaps.id", ondelete="CASCADE")
    )

    technology_id: Mapped[int] = mapped_column(
        ForeignKey("technologies.id", ondelete="CASCADE")
    )

    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE")
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE")
    )

    sub_topic_id: Mapped[int] = mapped_column(
        ForeignKey("sub_topics.id", ondelete="CASCADE")
    )

    # Basic info
    slug: Mapped[str] = mapped_column(Text, index=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)

    # ⭐ MAIN LESSON CONTENT
    content: Mapped[list[dict] | None] = mapped_column(JSON)

    # Examples
    examples: Mapped[list[dict] | None] = mapped_column(JSON)

    # Media
    image_banner_url: Mapped[str | None] = mapped_column(Text)
    images: Mapped[list[str] | None] = mapped_column(JSON)
    video_url: Mapped[str | None] = mapped_column(Text)

    # Learning sections
    when_to_use: Mapped[list[dict] | None] = mapped_column(JSON)
    when_to_avoid: Mapped[list[dict] | None] = mapped_column(JSON)

    # ✅ RENAMED
    what_it_solves: Mapped[list[dict] | None] = mapped_column(JSON)

    # ✅ RENAMED
    conceptual_understanding: Mapped[list[dict] | None] = mapped_column(JSON)

    common_mistakes: Mapped[list[dict] | None] = mapped_column(JSON)
    bonus_tips: Mapped[list[dict] | None] = mapped_column(JSON)
    related_topics: Mapped[list[str] | None] = mapped_column(JSON)

    # SEO
    seo_id: Mapped[int | None] = mapped_column(
        ForeignKey("seo_metadata.id", ondelete="SET NULL")
    )

    # Relationships
    sub_topic = relationship("SubTopic", back_populates="lessons")