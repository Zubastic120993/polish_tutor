"""Playwright-based UI smoke tests."""
import re

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.ui


def _goto_home(page, app_base_url):
    page.goto(app_base_url, wait_until="networkidle")
    # Wait for main shell to render
    expect(page.get_by_role("heading", name="Practice your Polish")).to_be_visible()


def test_homepage_shell(page, app_base_url):
    """Ensure the landing page renders the primary shell widgets."""
    _goto_home(page, app_base_url)

    # Connection badge renders even if hidden; verify text and existence
    connection = page.locator("#connection-status")
    expect(connection).to_have_count(1)
    expect(page.locator("#connection-status-text")).to_have_text(re.compile("Connecting|Connected"))
    expect(page.locator("#message-input")).to_have_count(1)
    expect(page.locator("#send-button")).to_be_disabled()
    expect(page.locator("#review-button")).to_be_visible()


def test_settings_modal_toggle(page, app_base_url):
    """Verify the settings modal can be opened and closed."""
    _goto_home(page, app_base_url)

    page.click("#settings-button")
    modal = page.locator("#settings-modal")
    expect(modal).to_have_class(re.compile(".*modal--active.*"))
    expect(modal.locator(".modal__title", has_text="Settings")).to_be_visible()

    page.click("#settings-modal-close")
    expect(modal).not_to_have_class(re.compile(".*modal--active.*"))


def test_helper_buttons_present(page, app_base_url):
    """Check key helper actions are present for user guidance."""
    _goto_home(page, app_base_url)

    helper_labels = ["Repeat", "Hint", "Slow Polish", "Topic", "Culture"]
    for label in helper_labels:
        expect(page.get_by_role("button", name=label)).to_be_visible()

    # Settings button doubles as theme/preferences entry point
    expect(page.locator("#settings-button")).to_be_visible()


def test_voice_flow_controls(page, app_base_url):
    """Ensure the voice controls are accessible for voice-only practice."""
    _goto_home(page, app_base_url)

    mic = page.locator("#mic-button")
    expect(mic).to_have_attribute("aria-label", re.compile("voice input", re.IGNORECASE))
    expect(page.locator("#floating-hint-text")).to_contain_text("Speak or type")


def test_text_input_flow(page, app_base_url):
    """Simulate the text-only flow by enabling the input and typing."""
    _goto_home(page, app_base_url)

    # Enable the input/send button to simulate an active lesson
    page.locator("#message-input").evaluate("el => el.removeAttribute('disabled')")
    page.locator("#send-button").evaluate("el => el.removeAttribute('disabled')")

    page.fill("#message-input", "To jest test.")
    expect(page.locator("#message-input")).to_have_value("To jest test.")


def test_branch_navigation_guidance(page, app_base_url):
    """Verify the lesson select/branch navigation controls are visible."""
    _goto_home(page, app_base_url)

    expect(page.locator("#lesson-catalog-select")).to_be_visible()
    expect(page.locator("#lesson-library-title")).to_have_text("Lesson Library")
