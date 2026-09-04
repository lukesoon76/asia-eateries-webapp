from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_admin, require_user
from app.db import get_connection
from app.schemas import RejectRequest, SubmissionIn, SubmissionOut

router = APIRouter()

# Promoted restaurant ids are offset well clear of the master-list's own
# numbering (which only grows via xlsx re-ingestion) so the two id spaces
# can never collide.
PROMOTED_ID_OFFSET = 10_000_000

SUBMISSION_FIELDS = [
    "name", "country", "state_city", "category", "cuisine", "area", "address",
    "phone", "hours", "price_guide", "instagram_web", "signature", "notes",
]


def _row_to_out(row) -> SubmissionOut:
    return SubmissionOut(**{f: row[f] for f in SUBMISSION_FIELDS}, id=row["id"], status=row["status"],
                          submitted_by=row["submitted_by"], reject_reason=row["reject_reason"],
                          promoted_restaurant_id=row["promoted_restaurant_id"], created_at=row["created_at"])


@router.post("/submissions", response_model=SubmissionOut)
def create_submission(body: SubmissionIn, user: dict = Depends(require_user)):
    conn = get_connection()
    try:
        cur = conn.execute(
            f"""
            INSERT INTO submissions (submitted_by, status, created_at, {", ".join(SUBMISSION_FIELDS)})
            VALUES (?, 'pending', ?, {", ".join("?" for _ in SUBMISSION_FIELDS)})
            """,
            [user["id"], datetime.now(timezone.utc).isoformat(), *[getattr(body, f) for f in SUBMISSION_FIELDS]],
        )
        conn.commit()
        row = conn.execute("SELECT * FROM submissions WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    return _row_to_out(row)


@router.get("/submissions/mine", response_model=list[SubmissionOut])
def my_submissions(user: dict = Depends(require_user)):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM submissions WHERE submitted_by = ? ORDER BY id DESC", (user["id"],)
        ).fetchall()
    finally:
        conn.close()
    return [_row_to_out(r) for r in rows]


@router.get("/admin/submissions", response_model=list[SubmissionOut])
def admin_list_submissions(status: str = "pending", admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM submissions WHERE status = ? ORDER BY id ASC LIMIT 200", (status,)
        ).fetchall()
    finally:
        conn.close()
    return [_row_to_out(r) for r in rows]


@router.post("/admin/submissions/{submission_id}/approve", response_model=SubmissionOut)
def approve_submission(submission_id: int, admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        sub = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
        if sub is None:
            raise HTTPException(status_code=404, detail="Submission not found")
        if sub["status"] != "pending":
            raise HTTPException(status_code=409, detail=f"Submission already {sub['status']}")

        new_id = PROMOTED_ID_OFFSET + submission_id
        conn.execute(
            f"""
            INSERT INTO restaurants (id, source, submission_id, {", ".join(SUBMISSION_FIELDS)})
            VALUES (?, 'User submission', ?, {", ".join("?" for _ in SUBMISSION_FIELDS)})
            """,
            [new_id, submission_id, *[sub[f] for f in SUBMISSION_FIELDS]],
        )
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            UPDATE submissions
            SET status = 'approved', reviewed_by = ?, reviewed_at = ?, promoted_restaurant_id = ?
            WHERE id = ?
            """,
            (admin["id"], now, new_id, submission_id),
        )
        conn.execute(
            "UPDATE photos SET restaurant_id = ? WHERE submission_id = ?", (new_id, submission_id)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
    finally:
        conn.close()
    return _row_to_out(row)


@router.post("/admin/submissions/{submission_id}/reject", response_model=SubmissionOut)
def reject_submission(submission_id: int, body: RejectRequest, admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        sub = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
        if sub is None:
            raise HTTPException(status_code=404, detail="Submission not found")
        if sub["status"] != "pending":
            raise HTTPException(status_code=409, detail=f"Submission already {sub['status']}")

        conn.execute(
            "UPDATE submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ? WHERE id = ?",
            (admin["id"], datetime.now(timezone.utc).isoformat(), body.reason, submission_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
    finally:
        conn.close()
    return _row_to_out(row)
