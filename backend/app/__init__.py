"""Application factory for the voice cloning backend."""

from flask import Flask
from flask_cors import CORS


def create_app():
    """Create and configure the Flask application."""

    app = Flask(__name__)
    CORS(app)

    from .routes import bp

    app.register_blueprint(bp)
    
    # Root endpoint
    @app.route('/')
    def index():
        return {'message': 'Voice Cloning API', 'status': 'running', 'api_prefix': '/api'}
    
    return app


app = create_app()
