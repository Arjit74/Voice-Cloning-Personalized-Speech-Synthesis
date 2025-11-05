"""
Flask API Backend for Voice Cloning
Integrates the Python voice cloning backend with the React frontend
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pathlib import Path
import os
import uuid
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import sys

# Import the voice cloning modules
from run_cli import synthesize

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configuration
UPLOAD_FOLDER = Path('enrolled_voices')
OUTPUT_FOLDER = Path('outputs')
MODELS_DIR = Path('models')
VOICES_DB = Path('enrolled_voices') / 'voices.json'

# Create directories
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

# Allowed audio extensions
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_voices_db():
    """Load the voices database"""
    if VOICES_DB.exists():
        with open(VOICES_DB, 'r') as f:
            return json.load(f)
    return []

def save_voices_db(voices):
    """Save the voices database"""
    with open(VOICES_DB, 'w') as f:
        json.dump(voices, f, indent=2)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Voice Cloning API is running'
    })

@app.route('/api/enroll', methods=['POST'])
def enroll_voice():
    """
    Enroll a new voice by accepting audio file and voice name
    Frontend sends: FormData with 'audio' (File) and 'voiceName' (string)
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        voice_name = request.form.get('voice_name', 'Unnamed Voice')
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({'error': 'Invalid file type. Supported: mp3, wav, m4a, flac, ogg, webm'}), 400
        
        # Generate unique ID and secure filename
        voice_id = f"voice_{uuid.uuid4().hex[:8]}"
        file_extension = audio_file.filename.rsplit('.', 1)[1].lower()
        filename = f"{voice_id}.{file_extension}"
        filepath = UPLOAD_FOLDER / filename
        
        # Save the audio file
        audio_file.save(str(filepath))
        
        # Create voice entry
        voice_entry = {
            'id': voice_id,
            'name': voice_name,
            'filename': filename,
            'filepath': str(filepath),
            'createdAt': datetime.now().isoformat()
        }
        
        # Update voices database
        voices = load_voices_db()
        voices.append(voice_entry)
        save_voices_db(voices)
        
        return jsonify({
            'success': True,
            'message': f'Voice "{voice_name}" enrolled successfully',
            'voice_id': voice_id,
            'voice_name': voice_name,
            'created_at': voice_entry['createdAt']
        }), 201
        
    except Exception as e:
        print(f"Error enrolling voice: {e}")
        return jsonify({'error': f'Failed to enroll voice: {str(e)}'}), 500

@app.route('/api/voices', methods=['GET'])
def get_voices():
    """
    Get list of all enrolled voices
    Frontend uses this to populate the voice selection dropdown
    """
    try:
        voices = load_voices_db()
        # Return only necessary info for frontend
        voices_list = [
            {
                'id': v['id'],
                'name': v['name'],
                'createdAt': v['createdAt']
            }
            for v in voices
        ]
        return jsonify({'voices': voices_list}), 200
    except Exception as e:
        print(f"Error getting voices: {e}")
        return jsonify({'error': f'Failed to get voices: {str(e)}'}), 500

@app.route('/api/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Synthesize speech from text using enrolled voice
    Frontend sends: { "text": "...", "voiceId": "voice_xxx" }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        text = data.get('text', '').strip()
        voice_id = data.get('voice_id', '')  # Changed from 'voiceId' to 'voice_id'
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if not voice_id:
            return jsonify({'error': 'No voice selected'}), 400
        
        # Find the voice in database
        voices = load_voices_db()
        voice = next((v for v in voices if v['id'] == voice_id), None)
        
        if not voice:
            return jsonify({'error': 'Voice not found'}), 404
        
        # Convert to absolute path
        voice_filepath = Path(voice['filepath'])
        if not voice_filepath.is_absolute():
            voice_filepath = Path.cwd() / voice_filepath
            
        if not voice_filepath.exists():
            return jsonify({'error': f'Voice file not found: {voice_filepath}'}), 404
        
        # Generate unique output filename
        output_filename = f"synthesis_{uuid.uuid4().hex[:8]}.wav"
        output_path = OUTPUT_FOLDER / output_filename
        
        # Call the voice cloning synthesis function
        print(f"Synthesizing: '{text}' with voice '{voice['name']}'")
        print(f"Voice file: {voice_filepath}")
        print(f"Output path: {output_path}")
        print(f"Models dir: {MODELS_DIR}")
        print("Starting synthesis... This may take 30-60 seconds...")
        
        try:
            # Flush output to see logs immediately
            sys.stdout.flush()
            
            synthesize(
                voice_path=voice_filepath,
                text=text,
                models_dir=MODELS_DIR,
                out_path=output_path
            )
            
            print(f"Synthesis completed! Output saved to: {output_path}")
            sys.stdout.flush()
        except Exception as synth_error:
            print(f"Synthesis error: {synth_error}")
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            raise
        
        if not output_path.exists():
            error_msg = 'Synthesis failed - output not generated'
            return jsonify({'error': error_msg}), 500
        
        # Return the audio file URL
        return jsonify({
            'success': True,
            'message': 'Speech synthesized successfully',
            'audio_url': f'/api/audio/{output_filename}'  # Changed from 'audioUrl'
        }), 200
        
    except Exception as e:
        print(f"Error synthesizing speech: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to synthesize speech: {str(e)}'}), 500

@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """
    Serve synthesized audio files
    Frontend uses this URL to play/download the generated audio
    """
    try:
        filepath = OUTPUT_FOLDER / filename
        if not filepath.exists():
            return jsonify({'error': 'Audio file not found'}), 404
        
        return send_file(
            str(filepath),
            mimetype='audio/wav',
            as_attachment=False,
            download_name=filename
        )
    except Exception as e:
        print(f"Error serving audio: {e}")
        return jsonify({'error': f'Failed to serve audio: {str(e)}'}), 500

@app.route('/api/voices/<voice_id>', methods=['DELETE'])
def delete_voice(voice_id):
    """
    Delete an enrolled voice
    Optional: Frontend can call this to remove voices
    """
    try:
        voices = load_voices_db()
        voice = next((v for v in voices if v['id'] == voice_id), None)
        
        if not voice:
            return jsonify({'error': 'Voice not found'}), 404
        
        # Delete the audio file
        voice_filepath = Path(voice['filepath'])
        if voice_filepath.exists():
            voice_filepath.unlink()
        
        # Remove from database
        voices = [v for v in voices if v['id'] != voice_id]
        save_voices_db(voices)
        
        return jsonify({
            'success': True,
            'message': f'Voice "{voice["name"]}" deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting voice: {e}")
        return jsonify({'error': f'Failed to delete voice: {str(e)}'}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Voice Cloning API Server")
    print("=" * 60)
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Output folder: {OUTPUT_FOLDER.absolute()}")
    print(f"Models folder: {MODELS_DIR.absolute()}")
    print("=" * 60)
    print("\nServer starting on http://localhost:5000")
    print("Frontend should connect to: http://localhost:5000/api")
    print("\nAvailable endpoints:")
    print("  GET  /api/health           - Health check")
    print("  POST /api/enroll           - Enroll new voice")
    print("  GET  /api/voices           - List enrolled voices")
    print("  POST /api/synthesize       - Generate speech")
    print("  GET  /api/audio/<filename> - Get audio file")
    print("=" * 60)
    
    # Run the Flask app (threaded for better handling of long requests)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
