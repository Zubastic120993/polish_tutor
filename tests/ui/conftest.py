"""Shared fixtures for UI smoke tests."""

import os
import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--app-base-url",
        action="store",
        default=os.getenv("APP_BASE_URL", "http://localhost:8000"),
        help="Base URL where the Patient Polish Tutor app is running.",
    )


@pytest.fixture(scope="session")
def app_base_url(request):
    """Return the base URL for UI smoke tests."""
    return request.config.getoption("--app-base-url")
