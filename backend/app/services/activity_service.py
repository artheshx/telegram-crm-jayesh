from sqlalchemy.orm import Session
from app.models.models import ActivityLog


def log_activity(
    db: Session,
    action: str,
    description: str = None,
    entity_type: str = None,
    entity_id: int = None,
    user: str = "system",
    level: str = "info",
):
    log = ActivityLog(
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        user=user,
        level=level,
    )
    db.add(log)
    db.commit()
    return log
