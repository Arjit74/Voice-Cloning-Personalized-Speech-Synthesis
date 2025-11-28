"""Gunicorn entry point for the voice cloning backend."""

from .app import app


if __name__ == "__main__":
    app.run()
