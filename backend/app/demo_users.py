"""Create local demonstration users without publishing credentials."""

import argparse
import json
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Role, User
from app.services.security import hash_password

LOCAL_ENVIRONMENTS = {"local", "dev", "development", "test"}
ROLE_DESCRIPTIONS = {
    "admin": "Administrator with authorized prototype management access",
    "monitor": "Territorial monitor who creates and reviews own observations",
    "validator": "Methodological validator who reviews pending observations",
    "public": "Read-only user of aggregated public information",
}
DEMO_USERS = {
    "admin": ("demo-admin", "demo.admin@example.local", "Demo Administrator"),
    "monitor": ("demo-monitor", "demo.monitor@example.local", "Demo Monitor"),
    "validator": ("demo-validator", "demo.validator@example.local", "Demo Validator"),
}


def _password_for(role_name: str) -> tuple[str, bool]:
    environment_name = f"DEMO_{role_name.upper()}_PASSWORD"
    configured = getattr(settings, environment_name.lower())
    if configured:
        if configured.startswith("<"):
            raise RuntimeError(f"{environment_name} still contains an example marker.")
        if len(configured) < 12:
            raise RuntimeError(f"{environment_name} must contain at least 12 characters.")
        return configured, False
    return secrets.token_urlsafe(18), True


def bootstrap_demo_users(
    db: Session,
    *,
    app_env: str,
    reset_passwords: bool = False,
) -> dict:
    if app_env.lower() not in LOCAL_ENVIRONMENTS:
        raise RuntimeError("Demo user creation is disabled outside local development and test.")

    roles: dict[str, Role] = {}
    for name, description in ROLE_DESCRIPTIONS.items():
        role = db.scalar(select(Role).where(Role.name == name))
        if role is None:
            role = Role(name=name, description=description)
            db.add(role)
            db.flush()
        else:
            role.description = description
        roles[name] = role

    created: list[str] = []
    retained: list[str] = []
    passwords_reset: list[str] = []
    generated_passwords: dict[str, str] = {}
    for role_name, (username, email, full_name) in DEMO_USERS.items():
        user = db.scalar(select(User).where(User.username == username))
        if user is None:
            user = db.scalar(select(User).where(User.email == email))
        if user is None:
            password, generated = _password_for(role_name)
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                password_hash=hash_password(password),
                role_id=roles[role_name].id,
                is_active=True,
                is_synthetic=True,
            )
            db.add(user)
            created.append(username)
            if generated:
                generated_passwords[username] = password
        else:
            user.username = username
            user.email = email
            user.full_name = full_name
            user.role_id = roles[role_name].id
            user.is_active = True
            user.is_synthetic = True
            if reset_passwords:
                password, generated = _password_for(role_name)
                user.password_hash = hash_password(password)
                passwords_reset.append(username)
                if generated:
                    generated_passwords[username] = password
            else:
                retained.append(username)

    db.commit()
    return {
        "created": created,
        "passwords_reset": passwords_reset,
        "retained_without_password_reset": retained,
        "generated_passwords_displayed_once": generated_passwords,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create local InfinityAtlas demo users.")
    parser.add_argument(
        "--reset-passwords",
        action="store_true",
        help="Explicitly replace local demo passwords using environment values or generated values.",
    )
    arguments = parser.parse_args()
    with SessionLocal() as db:
        result = bootstrap_demo_users(
            db,
            app_env=settings.app_env,
            reset_passwords=arguments.reset_passwords,
        )
    print(json.dumps(result, indent=2, sort_keys=True))
    if result["generated_passwords_displayed_once"]:
        print("Store these generated passwords locally now; they will not be shown again.")


if __name__ == "__main__":
    main()
