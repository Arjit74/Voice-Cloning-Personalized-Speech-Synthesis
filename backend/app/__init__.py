"""Application factory for the voice cloning backend."""

import os
from flask import Flask
from flask_cors import CORS


def create_app():
    """Create and configure the Flask application."""

    app = Flask(__name__)
    
    # CORS configuration - allow specific frontend URL or all origins
    allowed_origins = os.getenv('FRONTEND_URL', '*').split(',')
    cors_config = {
        "origins": allowed_origins if allowed_origins != ['*'] else '*',
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
    CORS(app, resources={r"/api/*": cors_config})

    from .routes import bp

    app.register_blueprint(bp)
    
    # Root endpoint
    @app.route('/')
    def index():
        return {'message': 'Voice Cloning API', 'status': 'running', 'api_prefix': '/api'}
    
    return app


app = create_app()
