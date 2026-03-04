"""
Updated seed_topics.py
Supports new JSON structure:

- seo_metadata is a SINGLE object
- No seo_id in topic/subtopics
- what_it_solves → DB problems
- conceptual_understanding → DB mental_models
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


# ── ENV ──────────────────────────────────────────────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    sys.exit("❌ DATABASE_URL not set.")

DEFAULT_JSON = Path(__file__).parent.parent / "json" / "frontend" / "html" / "topics_23.json"


# ── DB JSON COLUMNS ─────────────────────────────────────────
DB_JSON_COLUMNS = [
    "content",
    "examples",
    "images",
    "when_to_use",
    "when_to_avoid",
    "problems",
    "mental_models",
    "common_mistakes",
    "bonus_tips",
    "related_topics",
]


# ── HELPERS ─────────────────────────────────────────────────

def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def row_exists(session: Session, table: str, column: str, value) -> bool:
    result = session.execute(
        text(f"SELECT 1 FROM {table} WHERE {column} = :val"),
        {"val": value}
    ).fetchone()
    return result is not None


def _jsonb(value: Any) -> str | None:
    return json.dumps(value) if value is not None else None


def build_json_values(payload: dict) -> dict:
    """
    Map new JSON structure to DB structure
    """

    normalized = {
        "content": payload.get("content"),
        "examples": payload.get("examples"),
        "images": payload.get("images"),
        "when_to_use": payload.get("when_to_use"),
        "when_to_avoid": payload.get("when_to_avoid"),
        "problems": payload.get("what_it_solves"),
        "mental_models": payload.get("conceptual_understanding"),
        "common_mistakes": payload.get("common_mistakes"),
        "bonus_tips": payload.get("bonus_tips"),
        "related_topics": payload.get("related_topics"),
    }

    return {col: _jsonb(normalized.get(col)) for col in DB_JSON_COLUMNS}


# ── INSERT SEO ──────────────────────────────────────────────

def insert_seo(session: Session, seo: dict) -> int:
    result = session.execute(
        text("""
            INSERT INTO seo_metadata (
                meta_title,
                meta_description,
                keywords,
                canonical_url,
                robots,
                created_at,
                updated_at
            )
            VALUES (
                :meta_title,
                :meta_description,
                CAST(:keywords AS jsonb),
                :canonical_url,
                :robots,
                NOW(),
                NOW()
            )
            RETURNING id
        """),
        {
            "meta_title": seo.get("meta_title"),
            "meta_description": seo.get("meta_description"),
            "keywords": json.dumps(seo.get("keywords", [])),
            "canonical_url": seo.get("canonical_url"),
            "robots": seo.get("robots"),
        }
    )

    return result.fetchone()[0]


# ── INSERT TOPIC ────────────────────────────────────────────

def insert_topic(session: Session, topic: dict, seo_id: int | None) -> int:
    json_values = build_json_values(topic)

    result = session.execute(
        text("""
            INSERT INTO topics (
                roadmap_id,
                technology_id,
                module_id,
                slug,
                title,
                description,
                is_active,
                order_index,
                seo_id,
                content,
                examples,
                image_banner_url,
                images,
                video_url,
                when_to_use,
                when_to_avoid,
                problems,
                mental_models,
                common_mistakes,
                bonus_tips,
                related_topics,
                created_at,
                updated_at
            )
            VALUES (
                :roadmap_id,
                :technology_id,
                :module_id,
                :slug,
                :title,
                :description,
                :is_active,
                :order_index,
                :seo_id,
                CAST(:content AS jsonb),
                CAST(:examples AS jsonb),
                :image_banner_url,
                CAST(:images AS jsonb),
                :video_url,
                CAST(:when_to_use AS jsonb),
                CAST(:when_to_avoid AS jsonb),
                CAST(:problems AS jsonb),
                CAST(:mental_models AS jsonb),
                CAST(:common_mistakes AS jsonb),
                CAST(:bonus_tips AS jsonb),
                CAST(:related_topics AS jsonb),
                NOW(),
                NOW()
            )
            RETURNING id
        """),
        {
            "roadmap_id": topic["roadmap_id"],
            "technology_id": topic["technology_id"],
            "module_id": topic["module_id"],
            "slug": topic["slug"],
            "title": topic["title"],
            "description": topic.get("description"),
            "is_active": topic.get("is_active", True),
            "order_index": topic.get("order_index", 0),
            "seo_id": seo_id,
            "image_banner_url": topic.get("image_banner_url"),
            "video_url": topic.get("video_url"),
            **json_values,
        }
    )

    return result.fetchone()[0]


# ── INSERT SUBTOPIC ─────────────────────────────────────────

def insert_subtopic(session: Session, subtopic: dict, topic_id: int) -> int:
    json_values = build_json_values(subtopic)

    result = session.execute(
        text("""
            INSERT INTO sub_topics (
                roadmap_id,
                technology_id,
                module_id,
                topic_id,
                slug,
                title,
                description,
                is_active,
                order_index,
                content,
                examples,
                image_banner_url,
                images,
                video_url,
                when_to_use,
                when_to_avoid,
                problems,
                mental_models,
                common_mistakes,
                bonus_tips,
                related_topics,
                created_at,
                updated_at
            )
            VALUES (
                :roadmap_id,
                :technology_id,
                :module_id,
                :topic_id,
                :slug,
                :title,
                :description,
                :is_active,
                :order_index,
                CAST(:content AS jsonb),
                CAST(:examples AS jsonb),
                :image_banner_url,
                CAST(:images AS jsonb),
                :video_url,
                CAST(:when_to_use AS jsonb),
                CAST(:when_to_avoid AS jsonb),
                CAST(:problems AS jsonb),
                CAST(:mental_models AS jsonb),
                CAST(:common_mistakes AS jsonb),
                CAST(:bonus_tips AS jsonb),
                CAST(:related_topics AS jsonb),
                NOW(),
                NOW()
            )
            RETURNING id
        """),
        {
            "roadmap_id": subtopic["roadmap_id"],
            "technology_id": subtopic["technology_id"],
            "module_id": subtopic["module_id"],
            "topic_id": topic_id,
            "slug": subtopic["slug"],
            "title": subtopic["title"],
            "description": subtopic.get("description"),
            "is_active": subtopic.get("is_active", True),
            "order_index": subtopic.get("order_index", 0),
            "image_banner_url": subtopic.get("image_banner_url"),
            "video_url": subtopic.get("video_url"),
            **json_values,
        }
    )

    return result.fetchone()[0]


# ── MAIN ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", default=str(DEFAULT_JSON))
    args = parser.parse_args()

    json_path = Path(args.json)
    if not json_path.exists():
        sys.exit("❌ JSON file not found.")

    data = load_json(json_path)

    topic = data["topic"]
    subtopics = data.get("subtopics", [])
    seo_metadata = data.get("seo_metadata")

    engine = create_engine(DATABASE_URL)

    with Session(engine) as session:

        # Insert SEO
        seo_id = insert_seo(session, seo_metadata) if seo_metadata else None

        # Insert topic
        topic_id = insert_topic(session, topic, seo_id)
        print(f"✅ Inserted Topic ID: {topic_id}")

        # Insert subtopics
        for sub in subtopics:
            sub_id = insert_subtopic(session, sub, topic_id)
            print(f"   ↳ Inserted Subtopic ID: {sub_id}")

        session.commit()

    print("\n🎉 Seeding complete.")


if __name__ == "__main__":
    main()