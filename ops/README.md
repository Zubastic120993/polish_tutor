# Operations & Legacy Assets

This directory stores operational tooling and archived modules that are no longer part of the runtime application.

## legacy_backend/
Historical Murf queue workers, Redis configuration, and experimental agent code moved out of `src/`. Keep for reference or future reintroduction, but the FastAPI app does not import anything from here.

Feel free to delete this folder entirely if you do not need the old queue infrastructure.
