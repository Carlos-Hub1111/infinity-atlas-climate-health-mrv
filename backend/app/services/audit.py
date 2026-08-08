"""Append-only audit event creation helpers."""

from sqlalchemy.orm import Session

from app.models import AuditEvent, User


def record_audit_event(
    db: Session,
    *,
    event_type: str,
    entity_type: str,
    entity_id: int | None = None,
    actor: User | None = None,
    actor_role: str | None = None,
    previous_state: str | None = None,
    new_state: str | None = None,
    comment: str | None = None,
    methodology_version: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        actor_id=actor.id if actor else None,
        actor_role=actor.role.name if actor and actor.role else actor_role,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_state=previous_state,
        new_state=new_state,
        comment=comment,
        methodology_version=methodology_version,
    )
    db.add(event)
    return event
