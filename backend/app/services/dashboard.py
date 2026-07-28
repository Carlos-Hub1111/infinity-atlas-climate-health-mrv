"""Filtered dashboard aggregation owned by the backend."""

from dataclasses import asdict, dataclass, replace
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import AuditEvent, Observation, RiskScore, Territory, User
from app.services.risk import METHODOLOGY_VERSION

STATUSES = ("pending", "validated", "observed", "rejected")
PROVENANCE_TYPES = ("public_real", "controlled_test", "synthetic_demo")
RISK_LEVELS = ("low", "moderate", "high", "critical")
CATEGORIES = ("water", "waste", "heat", "environmental_pollution")


@dataclass(frozen=True)
class DashboardFilters:
    date_from: date | None = None
    date_to: date | None = None
    category: str | None = None
    status: str | None = None
    provenance: str | None = None
    risk_level: str | None = None
    territory_id: int | None = None
    search: str | None = None

    @property
    def active_count(self) -> int:
        return sum(value not in (None, "") for value in asdict(self).values())

    def public_dict(self) -> dict[str, str | int | None]:
        values = asdict(self)
        return {
            key: value.isoformat() if isinstance(value, date) else value
            for key, value in values.items()
        }


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _latest_risks(db: Session, observation_ids: list[int]) -> dict[int, RiskScore]:
    if not observation_ids:
        return {}
    risks = list(
        db.scalars(
            select(RiskScore)
            .where(RiskScore.observation_id.in_(observation_ids))
            .order_by(
                RiskScore.observation_id,
                RiskScore.calculated_at.desc(),
                RiskScore.id.desc(),
            )
        )
    )
    latest: dict[int, RiskScore] = {}
    for risk in risks:
        latest.setdefault(risk.observation_id, risk)
    return latest


def filtered_observations(
    db: Session,
    filters: DashboardFilters,
    *,
    user: User | None = None,
) -> tuple[list[Observation], dict[int, RiskScore]]:
    statement = select(Observation).options(joinedload(Observation.territory))
    if user is not None and user.role.name == "monitor":
        statement = statement.where(Observation.created_by_id == user.id)
    if filters.territory_id is not None:
        statement = statement.where(Observation.territory_id == filters.territory_id)
    if filters.category:
        statement = statement.where(Observation.category == filters.category)
    if filters.status:
        statement = statement.where(Observation.status == filters.status)
    if filters.provenance:
        statement = statement.where(Observation.data_provenance == filters.provenance)
    if filters.date_from:
        statement = statement.where(
            Observation.observed_at
            >= datetime.combine(filters.date_from, time.min, tzinfo=timezone.utc)
        )
    if filters.date_to:
        statement = statement.where(
            Observation.observed_at
            <= datetime.combine(filters.date_to, time.max, tzinfo=timezone.utc)
        )
    if filters.search:
        normalized = filters.search.strip().removeprefix("#")
        if normalized.isdigit():
            statement = statement.where(Observation.id == int(normalized))
        else:
            statement = statement.where(Observation.record_title.ilike(f"%{normalized}%"))

    observations = list(db.scalars(statement.order_by(Observation.observed_at.desc())))
    risks = _latest_risks(db, [observation.id for observation in observations])
    if filters.risk_level:
        observations = [
            observation
            for observation in observations
            if risks.get(observation.id)
            and risks[observation.id].risk_level == filters.risk_level
        ]
        risks = {
            observation.id: risks[observation.id]
            for observation in observations
            if observation.id in risks
        }
    return observations, risks


def _territory_timezone(observations: list[Observation], territory: Territory | None) -> str:
    if territory is not None:
        return territory.timezone
    if observations:
        return observations[0].territory.timezone
    return "UTC"


def build_dashboard(
    db: Session,
    filters: DashboardFilters,
    *,
    user: User | None = None,
) -> dict:
    territory = (
        db.get(Territory, filters.territory_id)
        if filters.territory_id is not None
        else db.scalar(
            select(Territory)
            .where(Territory.name == "San Cristobal")
            .order_by(Territory.id)
        )
    )
    effective_filters = (
        filters
        if filters.territory_id is not None or territory is None
        else replace(filters, territory_id=territory.id)
    )
    observations, risks = filtered_observations(db, effective_filters, user=user)
    status_counts = {key: 0 for key in STATUSES}
    provenance_counts = {key: 0 for key in PROVENANCE_TYPES}
    risk_counts = {key: 0 for key in RISK_LEVELS}
    category_counts = {key: 0 for key in CATEGORIES}

    timezone_name = _territory_timezone(observations, territory)
    try:
        territory_zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        territory_zone = ZoneInfo("UTC")
        timezone_name = "UTC"

    trend_counts: dict[str, int] = {}
    for observation in observations:
        status_counts[observation.status] = status_counts.get(observation.status, 0) + 1
        provenance_counts[observation.data_provenance] = (
            provenance_counts.get(observation.data_provenance, 0) + 1
        )
        category_counts[observation.category] = (
            category_counts.get(observation.category, 0) + 1
        )
        risk = risks.get(observation.id)
        if risk:
            risk_counts[risk.risk_level] = risk_counts.get(risk.risk_level, 0) + 1
        local_date = _as_utc(observation.observed_at).astimezone(territory_zone).date()
        trend_counts[local_date.isoformat()] = trend_counts.get(local_date.isoformat(), 0) + 1

    dates = [_as_utc(observation.observed_at).date() for observation in observations]
    role_metrics: dict[str, int | float] = {}
    role_name = user.role.name if user is not None else "public"
    if role_name == "monitor":
        role_metrics = {
            "my_records": len(observations),
            "pending": status_counts["pending"],
            "observed_requiring_response": status_counts["observed"],
        }
    elif role_name == "validator":
        pending_dates = [
            _as_utc(observation.created_at)
            for observation in observations
            if observation.status == "pending"
        ]
        oldest_hours = (
            max(
                0,
                int(
                    (
                        datetime.now(timezone.utc) - min(pending_dates)
                    ).total_seconds()
                    // 3600
                ),
            )
            if pending_dates
            else 0
        )
        role_metrics = {
            "pending_queue": status_counts["pending"],
            "observed": status_counts["observed"],
            "high_priority": risk_counts["high"] + risk_counts["critical"],
            "oldest_pending_hours": oldest_hours,
        }
    elif role_name == "admin":
        users = list(db.scalars(select(User)))
        recent_events = list(
            db.scalars(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(25))
        )
        role_metrics = {
            "total_users": len(users),
            "active_users": sum(user_account.is_active for user_account in users),
            "recent_activity": len(recent_events),
            "records": len(observations),
        }

    return {
        "scope": role_name,
        "generated_at": datetime.now(timezone.utc),
        "territory": (
            {
                "id": territory.id,
                "name": territory.name,
                "timezone": territory.timezone,
            }
            if territory is not None
            else None
        ),
        "period": {
            "start": filters.date_from or (min(dates) if dates else None),
            "end": filters.date_to or (max(dates) if dates else None),
        },
        "filters": filters.public_dict(),
        "active_filter_count": filters.active_count,
        "total_observations": len(observations),
        "status_counts": status_counts,
        "provenance_counts": provenance_counts,
        "risk_counts": risk_counts,
        "category_counts": category_counts,
        "trends": [
            {"date": trend_date, "count": count}
            for trend_date, count in sorted(trend_counts.items())
        ],
        "methodology_version": METHODOLOGY_VERSION,
        "methodological_notice": (
            "Dashboard risk levels are methodological and non-clinical. Controlled tests and "
            "synthetic demonstrations are never presented as verified territorial events."
        ),
        "role_metrics": role_metrics,
        "available_territories": [
            {
                "id": item.id,
                "name": item.name,
                "timezone": item.timezone,
            }
            for item in db.scalars(select(Territory).order_by(Territory.name))
        ],
    }
