"""
seed_topics.py

Seeds the `seo_metadata` and `topics` tables from topics.json.

Typical workflow:
    1. python generate_topics_json.py   ← converts raw → clean topics.json
    2. python seed_topics.py            ← seeds topics.json into DB

Usage:
    python seed_topics.py
    python seed_topics.py --json path/to/topics.json
    python seed_topics.py --dry-run
    python seed_topics.py --clear

Requirements:
    pip install sqlalchemy psycopg2-binary python-dotenv

Environment (.env or shell):
    DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/dbname
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

# ── Env ───────────────────────────────────────────────────────────────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("❌  DATABASE_URL not set. Add it to your .env file.")

DEFAULT_JSON = Path(__file__).parent.parent / "json" / "frontend" / "html" / "topics_16.json"

# ── JSON fields that map to DB JSON columns ───────────────────────────────────
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def row_exists(session: Session, table: str, column: str, value) -> bool:
    row = session.execute(
        text(f"SELECT 1 FROM {table} WHERE {column} = :{column}"),
        {column: value},
    ).fetchone()
    return row is not None





def _jsonb(value: Any) -> str | None:
    return json.dumps(value) if value is not None else None


def build_json_values(payload: dict) -> dict[str, str | None]:
    """
    Build JSONB payloads while preserving source JSON naming.

    Mapping:
      - `what_it_solves` -> DB `problems`
      - `conceptual_understanding` -> DB `mental_models`
    """
    problems_source = payload.get("problems")
    if problems_source is None:
        problems_source = payload.get("what_it_solves")

    models_source = payload.get("mental_models")
    if models_source is None:
        models_source = payload.get("conceptual_understanding")

    normalized_payload = {
        "content": payload.get("content"),
        "examples": payload.get("examples"),
        "images": payload.get("images"),
        "when_to_use": payload.get("when_to_use"),
        "when_to_avoid": payload.get("when_to_avoid"),
        "problems": problems_source,
        "mental_models": models_source,
        "common_mistakes": payload.get("common_mistakes"),
        "bonus_tips": payload.get("bonus_tips"),
        "related_topics": payload.get("related_topics"),
    }

    return {col: _jsonb(normalized_payload.get(col)) for col in DB_JSON_COLUMNS}


def _normalize_canonical_path(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().strip("/").lower()


def find_matching_seo(
    seo_meta: list[dict],
    seo_id: int | None,
    slug: str | None,
    parent_slug: str | None = None,
) -> dict | None:
    """
    Resolve SEO rows robustly when IDs are duplicated in JSON.
    Prefers canonical_url matching by slug path.
    """
    normalized_slug = (slug or "").strip().strip("/").lower()
    normalized_parent_slug = (parent_slug or "").strip().strip("/").lower()

    target_suffixes = [normalized_slug] if normalized_slug else []
    if normalized_slug and normalized_parent_slug:
        target_suffixes.insert(0, f"{normalized_parent_slug}/{normalized_slug}")

    def canonical_matches(seo: dict) -> bool:
        canonical = _normalize_canonical_path(seo.get("canonical_url"))
        return any(canonical.endswith(suffix) for suffix in target_suffixes)

    candidates = [seo for seo in seo_meta if seo.get("id") == seo_id] if seo_id is not None else []
    for seo in candidates:
        if canonical_matches(seo):
            return seo

    if candidates:
        return candidates[0]

    for seo in seo_meta:
        if canonical_matches(seo):
            return seo

    return None


def insert_seo(session: Session, seo: dict) -> int:
    result = session.execute(
        text("""
            INSERT INTO seo_metadata (
                meta_title, meta_description, keywords,
                canonical_url, robots,
                og_title, og_description, og_type, og_url, og_site_name,
                og_image_url, og_image_width, og_image_height, og_image_alt,
                twitter_card, twitter_title, twitter_description, twitter_image,
                created_at, updated_at
            ) VALUES (
                :meta_title, :meta_description, CAST(:keywords AS jsonb),
                :canonical_url, :robots,
                :og_title, :og_description, :og_type, :og_url, :og_site_name,
                :og_image_url, :og_image_width, :og_image_height, :og_image_alt,
                :twitter_card, :twitter_title, :twitter_description, :twitter_image,
                NOW(), NOW()
            )
            RETURNING id
        """),
        {
            "meta_title":          seo.get("meta_title"),
            "meta_description":    seo.get("meta_description"),
            "keywords":            json.dumps(seo["keywords"]) if seo.get("keywords") else None,
            "canonical_url":       seo.get("canonical_url"),
            "robots":              seo.get("robots"),
            "og_title":            seo.get("og_title"),
            "og_description":      seo.get("og_description"),
            "og_type":             seo.get("og_type"),
            "og_url":              seo.get("og_url"),
            "og_site_name":        seo.get("og_site_name"),
            "og_image_url":        seo.get("og_image_url"),
            "og_image_width":      seo.get("og_image_width"),
            "og_image_height":     seo.get("og_image_height"),
            "og_image_alt":        seo.get("og_image_alt"),
            "twitter_card":        seo.get("twitter_card"),
            "twitter_title":       seo.get("twitter_title"),
            "twitter_description": seo.get("twitter_description"),
            "twitter_image":       seo.get("twitter_image"),
        },
    )
    return result.fetchone()[0]


def insert_topic(session: Session, topic: dict, seo_id: int | None) -> int:
    json_values = build_json_values(topic)

    result = session.execute(
        text("""
            INSERT INTO topics (
                roadmap_id, technology_id, module_id,
                slug, title, description,
                is_active, order_index, seo_id,
                content, examples, image_banner_url, images, video_url,
                when_to_use, when_to_avoid, problems,
                mental_models, common_mistakes, bonus_tips, related_topics,
                created_at, updated_at
            ) VALUES (
                :roadmap_id, :technology_id, :module_id,
                :slug, :title, :description,
                :is_active, :order_index, :seo_id,
                CAST(:content AS jsonb), CAST(:examples AS jsonb), :image_banner_url, CAST(:images AS jsonb), :video_url,
                CAST(:when_to_use AS jsonb), CAST(:when_to_avoid AS jsonb), CAST(:problems AS jsonb),
                CAST(:mental_models AS jsonb), CAST(:common_mistakes AS jsonb), CAST(:bonus_tips AS jsonb), CAST(:related_topics AS jsonb),
                NOW(), NOW()
            )
            RETURNING id
        """),
        {
            "roadmap_id":       topic["roadmap_id"],
            "technology_id":    topic["technology_id"],
            "module_id":        topic["module_id"],
            "slug":             topic["slug"],
            "title":            topic["title"],
            "description":      topic.get("description"),
            "is_active":        topic.get("is_active", True),
            "order_index":      topic.get("order_index", 0),
            "seo_id":           seo_id,
            "image_banner_url": topic.get("image_banner_url"),
            "video_url":        topic.get("video_url"),
            **json_values,
        },
    )
    return result.fetchone()[0]


def insert_subtopic(session: Session, st: dict, seo_id: int | None, topic_id: int) -> int:
    json_values = build_json_values(st)

    result = session.execute(
        text("""
            INSERT INTO sub_topics (
                roadmap_id, technology_id, module_id, topic_id,
                slug, title, description,
                is_active, order_index, seo_id,
                content, examples, image_banner_url, images, video_url,
                when_to_use, when_to_avoid, problems,
                mental_models, common_mistakes, bonus_tips, related_topics,
                created_at, updated_at
            ) VALUES (
                :roadmap_id, :technology_id, :module_id, :topic_id,
                :slug, :title, :description,
                :is_active, :order_index, :seo_id,
                CAST(:content AS jsonb), CAST(:examples AS jsonb), :image_banner_url, CAST(:images AS jsonb), :video_url,
                CAST(:when_to_use AS jsonb), CAST(:when_to_avoid AS jsonb), CAST(:problems AS jsonb),
                CAST(:mental_models AS jsonb), CAST(:common_mistakes AS jsonb), CAST(:bonus_tips AS jsonb), CAST(:related_topics AS jsonb),
                NOW(), NOW()
            )
            RETURNING id
        """),
        {
            "roadmap_id":       st["roadmap_id"],
            "technology_id":    st["technology_id"],
            "module_id":        st["module_id"],
            "topic_id":         topic_id,
            "slug":             st["slug"],
            "title":            st["title"],
            "description":      st.get("description"),
            "is_active":        st.get("is_active", True),
            "order_index":      st.get("order_index", 0),
            "seo_id":           seo_id,
            "image_banner_url": st.get("image_banner_url"),
            "video_url":        st.get("video_url"),
            **json_values,
        },
    )
    return result.fetchone()[0]


def clear_tables(session: Session) -> None:
    print("🗑️  Clearing topics, sub_topics and related seo_metadata rows …")
    session.execute(text("""
        DELETE FROM seo_metadata
        WHERE id IN (SELECT seo_id FROM topics WHERE seo_id IS NOT NULL)
        OR id IN (SELECT seo_id FROM sub_topics WHERE seo_id IS NOT NULL)
    """))
    session.execute(text("DELETE FROM sub_topics"))
    session.execute(text("DELETE FROM topics"))
    print("   Done.\n")


def validate_fk(session: Session, topic: dict) -> None:
    """Exit early if any foreign key references are missing."""
    print("🔎  Validating foreign keys …")
    missing = {}

    for fk_table, fk_field in [
        ("roadmaps",    "roadmap_id"),
        ("technologies","technology_id"),
        ("modules",     "module_id"),
    ]:
        val = topic[fk_field]
        if not row_exists(session, fk_table, "id", val):
            missing[fk_table] = [val]

    if missing:
        for table, ids in missing.items():
            print(f"   ❌  Missing in '{table}': {ids}")
        sys.exit(
            "\n❌  Foreign key validation failed. "
            "Seed parent tables first (roadmaps → technologies → modules → topics)."
        )

    print("   ✅  All foreign keys valid.\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed topics and subtopics into the database.")
    parser.add_argument("--json",    default=str(DEFAULT_JSON), help="Path to topics.json")
    parser.add_argument("--dry-run", action="store_true",       help="Preview without DB writes")
    parser.add_argument("--clear",   action="store_true",       help="Delete all topics/subtopics before seeding")
    args = parser.parse_args()

    json_path = Path(args.json)
    if not json_path.exists():
        sys.exit(f"❌  File not found: {json_path}")

    data      = load_json(json_path)
    topic     = data.get("topic")
    subtopics = data.get("subtopics", [])
    seo_meta = data.get("seo_metadata", [])

    # 🔥 normalize: allow dict OR list
    if isinstance(seo_meta, dict):
        seo_meta = [seo_meta]
    elif not isinstance(seo_meta, list):
        seo_meta = []

    if not topic:
        sys.exit("❌  No topic found in the JSON file.")

    print(f"📋  Found topic '{topic['title']}' and {len(subtopics)} subtopics in {json_path.name}\n")

    # Match SEO record to the topic by id
    topic_seo = find_matching_seo(
        seo_meta=seo_meta,
        seo_id=topic.get("seo_id"),
        slug=topic.get("slug"),
    )
    
    # ── Dry run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        print("🔍  Dry-run mode — no database writes.\n")
        print(f"── TOPIC ──────────────────────────────────────────────────────")
        print(
            f"  [001] mod={topic['module_id']:02d} | "
            f"order={topic.get('order_index',0):02d} | "
            f"slug={topic['slug']}"
        )
        print(f"         title    : {topic['title']}")
        print(f"         seo_title: {topic_seo.get('meta_title', '— (no seo)') if topic_seo else '— (no seo)'}")
        
        print(f"\n── SUBTOPICS ──────────────────────────────────────────────────")
        for i, st in enumerate(subtopics, 1):
            st_seo = find_matching_seo(
                seo_meta=seo_meta,
                seo_id=st.get("seo_id"),
                slug=st.get("slug"),
                parent_slug=topic.get("slug"),
            )
            print(
                f"  [{i:03d}] topic_id=TBD | "
                f"mod={st['module_id']:02d} | "
                f"order={st.get('order_index', 0):02d} | "
                f"slug={st['slug']}"
            )
            print(f"         title    : {st['title']}")
            print(f"         seo_title: {st_seo.get('meta_title', '— (no seo)') if st_seo else '— (no seo)'}")
            
        print(f"\n✅  Dry-run complete. Topic and {len(subtopics)} subtopics validated.")
        return

    # ── Seed ─────────────────────────────────────────────────────────────────
    engine    = create_engine(DATABASE_URL, echo=False)
    t_inserted  = 0
    t_skipped   = 0
    t_errors    = 0
    
    s_inserted  = 0
    s_skipped   = 0
    s_errors    = 0

    with Session(engine) as session:
        if args.clear:
            clear_tables(session)
            session.commit()

        validate_fk(session, topic)

        slug = topic["slug"]

        tid = None
        if row_exists(session, "topics", "slug", slug):
            print(f"  ⏭️  Skip TOPIC '{topic['title']}' — slug already exists.")
            t_skipped += 1
            # Need the existing topic id for subtopics
            existing_t = session.execute(
                text("SELECT id FROM topics WHERE slug = :slug"),
                {"slug": slug}
            ).fetchone()
            if existing_t:
                tid = existing_t[0]
        else:
            try:
                seo_id = insert_seo(session, topic_seo) if topic_seo else None
                tid    = insert_topic(session, topic, seo_id)

                print(
                    f"  ✅  TOPIC [{tid:04d}] mod={topic['module_id']:02d} "
                    f"ord={topic.get('order_index',0):02d}  '{topic['title']}'"
                    f"  seo_id={seo_id}"
                )
                t_inserted += 1
                # Persist topic before subtopics so later subtopic errors
                # cannot roll back the parent row.
                session.commit()

            except Exception as exc:
                print(f"  ❌  Error on TOPIC '{topic['title']}': {exc}")
                session.rollback()
                t_errors += 1
                return # Can't do subtopics if topic failed
                
        # Now seed subtopics
        if tid is not None:
            for st in subtopics:
                st_slug = st["slug"]
                
                if row_exists(session, "sub_topics", "slug", st_slug):
                    print(f"    ⏭️  Skip SUBTOPIC '{st['title']}' — slug already exists.")
                    s_skipped += 1
                    continue
                    
                try:
                    # Isolate each subtopic write so failures don't poison
                    # the outer transaction or rollback prior successful inserts.
                    with session.begin_nested():
                        st_seo = find_matching_seo(
                            seo_meta=seo_meta,
                            seo_id=st.get("seo_id"),
                            slug=st.get("slug"),
                            parent_slug=topic.get("slug"),
                        )

                        seo_id = insert_seo(session, st_seo) if st_seo else None
                        stid = insert_subtopic(session, st, seo_id, tid)

                    print(
                        f"    ✅  SUBTOPIC [{stid:04d}] "
                        f"topic={tid} "
                        f"ord={st.get('order_index', 0):02d}  "
                        f"'{st['title']}'  "
                        f"seo_id={seo_id}"
                    )
                    s_inserted += 1

                except Exception as exc:
                    print(f"    ❌  Error on SUBTOPIC '{st['title']}': {exc}")
                    s_errors += 1
                    continue

        session.commit()

    print(f"\n🎉  Done!")
    print(f"    Topics   : Inserted: {t_inserted}  |  Skipped: {t_skipped}  |  Errors: {t_errors}")
    print(f"    Subtopics: Inserted: {s_inserted}  |  Skipped: {s_skipped}  |  Errors: {s_errors}")


if __name__ == "__main__":
    main()
