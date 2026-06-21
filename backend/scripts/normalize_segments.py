"""One-time backfill: normalize every existing segment title to the house style
and merge segments that collapse to the same title within a sector.

Re-points company_segments + segment_synthesis from each duplicate onto a single
survivor, then deletes the duplicate. Idempotent — safe to run repeatedly.

Run from the backend/ dir:  uv run python -m scripts.normalize_segments
Add --dry-run to preview the rename/merge map without writing.
"""

from __future__ import annotations

import sys
from collections import defaultdict

from app.db.models import CompanySegment, Segment, SegmentSynthesis
from app.db.session import SessionLocal
from app.services.ingestion.segment_naming import normalize_segment_title


def _merge_into(db, survivor: Segment, dupe: Segment) -> None:
    """Move dupe's company links + synthesis onto survivor, then delete dupe."""
    # existing (company_id) already linked to the survivor — avoid uq violation
    survivor_company_ids = {
        cl.company_id
        for cl in db.query(CompanySegment).filter_by(segment_id=survivor.id).all()
    }
    for link in db.query(CompanySegment).filter_by(segment_id=dupe.id).all():
        if link.company_id in survivor_company_ids:
            db.delete(link)  # already a member of the survivor
        else:
            link.segment_id = survivor.id
            survivor_company_ids.add(link.company_id)

    # 1:1 synthesis — keep the survivor's; drop the dupe's if survivor has one
    survivor_syn = db.query(SegmentSynthesis).filter_by(segment_id=survivor.id).first()
    dupe_syn = db.query(SegmentSynthesis).filter_by(segment_id=dupe.id).first()
    if dupe_syn is not None:
        if survivor_syn is None:
            dupe_syn.segment_id = survivor.id
        else:
            db.delete(dupe_syn)

    if not survivor.focal_company and dupe.focal_company:
        survivor.focal_company = dupe.focal_company

    db.delete(dupe)


def run(dry_run: bool = False) -> None:
    db = SessionLocal()
    renames, merges = 0, 0
    try:
        segments = db.query(Segment).all()
        # group by (sector_id, normalized title, case-insensitive)
        groups: dict[tuple, list[Segment]] = defaultdict(list)
        for seg in segments:
            new_title = normalize_segment_title(seg.title) or seg.title
            groups[(seg.sector_id, new_title.lower())].append(seg)

        for (sector_id, _key), segs in groups.items():
            new_title = normalize_segment_title(segs[0].title) or segs[0].title
            # survivor = the one with the most company links (then oldest)
            segs.sort(key=lambda s: (-len(s.links), str(s.created_at)))
            survivor, dupes = segs[0], segs[1:]

            if survivor.title != new_title:
                print(f"  rename: {survivor.title!r} -> {new_title!r}")
                renames += 1
                if not dry_run:
                    survivor.title = new_title

            for dupe in dupes:
                print(f"  merge:  {dupe.title!r} -> {new_title!r}")
                merges += 1
                if not dry_run:
                    _merge_into(db, survivor, dupe)

        if dry_run:
            print(f"\n[dry-run] would rename {renames}, merge {merges}. No changes written.")
            db.rollback()
        else:
            db.commit()
            print(f"\nDone: renamed {renames}, merged {merges} segment(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run(dry_run="--dry-run" in sys.argv)
