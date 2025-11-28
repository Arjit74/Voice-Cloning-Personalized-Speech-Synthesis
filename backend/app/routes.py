"""
Flask API Backend for Voice Cloning
Integrates the Python voice cloning backend with the React frontend
"""

from flask import Blueprint, request, jsonify, send_file
from pathlib import Path
import uuid
import json
from datetime import datetime
import sys

from .voice_cloning import synthesize

bp = Blueprint('voice_cloning', __name__, url_prefix='/api')

BASE_DIR = Path(__file__).resolve().parents[1]

# Configuration
UPLOAD_FOLDER = BASE_DIR / 'enrolled_voices'
OUTPUT_FOLDER = BASE_DIR / 'outputs'
MODELS_DIR = BASE_DIR / 'models'
VOICES_DB = UPLOAD_FOLDER / 'voices.json'

# Create directories with parents
try:
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
    VOICES_DB.parent.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"Failed to create directories: {e}")
    sys.exit(1)

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

@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Voice Cloning API is running'
    })

@bp.route('/enroll', methods=['POST'])
def enroll_voice():
    """
    Enroll a new voice by accepting audio file and voice name
    Frontend sends: FormData with 'audio' (File) and 'voice_name' (string)
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        voice_name = request.form.get('voice_name', 'Unnamed Voice').strip()
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({'error': 'Invalid file type. Supported: mp3, wav, m4a, flac, ogg, webm'}), 400
        
        # Ensure upload folder exists
        UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
        
        # Generate unique ID and secure filename
        voice_id = f"voice_{uuid.uuid4().hex[:8]}"
        file_extension = audio_file.filename.rsplit('.', 1)[1].lower()
        filename = f"{voice_id}.{file_extension}"
        filepath = UPLOAD_FOLDER / filename
        
        # Save the audio file with error handling
        try:
            audio_file.save(str(filepath))
            print(f"✓ Audio file saved: {filepath}")
        except Exception as file_err:
            print(f"✗ Failed to save audio file: {file_err}")
            return jsonify({'error': f'Failed to save audio: {str(file_err)}'}), 500
        
        # Create voice entry
        voice_entry = {
            'id': voice_id,
            'name': voice_name,
            'filename': filename,
            'createdAt': datetime.now().isoformat()
        }
        
        # Update voices database with error handling
        try:
            VOICES_DB.parent.mkdir(parents=True, exist_ok=True)
            voices = load_voices_db()
            voices.append(voice_entry)
            save_voices_db(voices)
            print(f"✓ Voice '{voice_name}' (ID: {voice_id}) enrolled successfully")
        except Exception as db_err:
            print(f"✗ Failed to update voices DB: {db_err}")
            return jsonify({'error': f'Failed to save voice metadata: {str(db_err)}'}), 500
        
        return jsonify({
            'success': True,
            'message': f'Voice "{voice_name}" enrolled successfully',
            'voice_id': voice_id,
            'voice_name': voice_name,
            'created_at': voice_entry['createdAt']
        }), 201
        
    except Exception as e:
        print(f"✗ Error enrolling voice: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to enroll voice: {str(e)}'}), 500

@bp.route('/voices', methods=['GET'])
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

@bp.route('/synthesize', methods=['POST'])
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
        
        # Reconstruct path from UPLOAD_FOLDER (server-agnostic)
        voice_filepath = UPLOAD_FOLDER / voice['filename']
            
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
            return jsonify({'error': f'Synthesis failed: {str(synth_error)}'}), 500
        
        if not output_path.exists():
            error_msg = 'Synthesis failed - output not generated'
            return jsonify({'error': error_msg}), 500
        
        # Return the audio file URL
        return jsonify({
            'success': True,
            'message': 'Speech synthesized successfully',
            'audio_url': f'/api/audio/{output_filename}'
        }), 200
        
    except Exception as e:
        print(f"Error synthesizing speech: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to synthesize speech: {str(e)}'}), 500

@bp.route('/audio/<filename>', methods=['GET'])
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

@bp.route('/voices/<voice_id>', methods=['DELETE'])
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
        voice_filepath = UPLOAD_FOLDER / voice['filename']
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

@bp.route('/spectrogram/<audio_filename>', methods=['GET'])
def get_spectrogram(audio_filename):
    """
    Generate and return mel-spectrogram data for visualization
    Frontend can use this to display real-time mel-spectrogram
    """
    try:
        print(f"[Spectrogram] Requested file: {audio_filename}")
        filepath = OUTPUT_FOLDER / audio_filename
        print(f"[Spectrogram] Full path: {filepath}")
        print(f"[Spectrogram] File exists: {filepath.exists()}")

        if not filepath.exists():
            print(f"[Spectrogram] ERROR: File not found: {filepath}")
            return jsonify({'error': f'Audio file {audio_filename} not found'}), 404
        
        # Import librosa for mel-spectrogram generation
        import librosa
        import numpy as np
        
        print(f"[Spectrogram] Loading audio file...")
        # Load audio file
        y, sr = librosa.load(str(filepath), sr=None)
        print(f"[Spectrogram] Audio loaded: shape={y.shape}, sr={sr}")
        
        # Generate mel-spectrogram
        # 80 mel bands (common for Tacotron2), hop_length varies with sample rate
        mel_spec = librosa.feature.melspectrogram(
            y=y, 
            sr=sr,
            n_mels=80,
            hop_length=512
        )
        print(f"[Spectrogram] Mel-spec generated: shape={mel_spec.shape}")
        
        # Convert to dB scale (log scale for better visualization)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Normalize to 0-255 range for visualization
        mel_spec_normalized = np.clip(
            ((mel_spec_db + 80) / 80 * 255), 
            0, 
            255
        ).astype(np.uint8)
        
        # Convert to list for JSON serialization
        # Transpose to time x frequency format for frontend
        spectrogram_data = mel_spec_normalized.T.tolist()
        
        print(f"[Spectrogram] Successfully generated spectrogram: {len(spectrogram_data)} time steps")
        
        return jsonify({
            'spectrogram': spectrogram_data,
            'n_mels': 80,
            'shape': {
                'time_steps': len(spectrogram_data),
                'frequency_bins': 80
            }
        }), 200
        
    except Exception as e:
        print(f"[Spectrogram] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate spectrogram: {str(e)}'}), 500

@bp.route('/waveform/<audio_filename>', methods=['GET'])
def get_waveform(audio_filename):
    """
    Serve audio waveform as numeric array for real-time FFT visualization
    Frontend fetches this and computes FFT using Web Audio API
    """
    try:
        filepath = OUTPUT_FOLDER / audio_filename
        if not filepath.exists():
            return jsonify({'error': 'Audio file not found'}), 404
        
        import soundfile as sf
        import numpy as np
        
        # Load audio file
        # soundfile returns (data, sample_rate)
        y, sr = sf.read(str(filepath))
        
        # If stereo, convert to mono by taking first channel or averaging
        if len(y.shape) > 1:
            y = np.mean(y, axis=1)
        
        # Ensure float32 for compatibility
        y = np.asarray(y, dtype=np.float32)
        
        # Downsample if very long to reduce JSON payload
        # Typical waveform for 60s at 22050Hz = 1.3M samples
        # For FFT we can use 8000 Hz safely (captures up to 4 kHz)
        target_sr = 8000
        if sr > target_sr:
            # Calculate downsample factor
            resample_ratio = target_sr / sr
            new_length = int(len(y) * resample_ratio)
            # Simple linear interpolation for downsampling
            indices = np.linspace(0, len(y) - 1, new_length)
            y = np.interp(indices, np.arange(len(y)), y)
            sr = target_sr
        
        # Convert to list for JSON serialization
        waveform_data = y.tolist()
        
        return jsonify({
            'waveform': waveform_data,
            'sample_rate': sr,
            'duration': len(y) / sr,
            'samples': len(y)
        }), 200
        
    except ImportError as ie:
        err_msg = f'Soundfile library not available: {str(ie)}'
        return jsonify({'error': err_msg}), 500
    except Exception as e:
        print(f"Error serving waveform: {e}")
        import traceback
        traceback.print_exc()
        err_msg = f'Failed to generate waveform: {str(e)}'
        return jsonify({'error': err_msg}), 500


# =====================
# SONG CONVERSION ROUTES
# =====================

@bp.route('/convert_song', methods=['POST'])
def convert_song():
    """
    Convert a song to use the user's enrolled voice.
    
    Process:
    1. Separate vocals from instrumental using Demucs
    2. Extract/prepare lyrics from vocal
    3. Synthesize using user's voice
    4. Mix synthesized vocal with instrumental
    5. Apply optional audio effects
    
    Args (form data):
        song: MP3/WAV/M4A/FLAC file
        voice_id: ID of enrolled voice to use
        language: 'english' or 'hindi'
        add_effects: 'true'/'false' to add reverb/compression
    
    Returns:
        {
            "status": "success",
            "audio_url": "/api/audio/converted_song_[uuid].wav",
            "filename": "converted_song_[uuid].wav"
        }
    """
    try:
        # Validate request
        if 'song' not in request.files:
            return jsonify({'error': 'No song file provided'}), 400
        
        if 'voice_id' not in request.form:
            return jsonify({'error': 'No voice_id provided'}), 400
        
        song_file = request.files['song']
        voice_id = request.form.get('voice_id')
        language = request.form.get('language', 'english')
        add_effects = request.form.get('add_effects', 'true').lower() == 'true'
        
        # Validate file
        if song_file.filename == '':
            return jsonify({'error': 'No song file selected'}), 400
        
        if not allowed_file(song_file.filename):
            return jsonify({'error': f'Unsupported file format. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Check if voice exists
        voices = load_voices_db()
        voice_record = next((v for v in voices if v['id'] == voice_id), None)
        if not voice_record:
            return jsonify({'error': f'Voice not found: {voice_id}'}), 404
        
        voice_path = UPLOAD_FOLDER / voice_record['file']
        if not voice_path.exists():
            return jsonify({'error': f'Voice file missing: {voice_path}'}), 500
        
        # Save uploaded song temporarily
        song_filename = f"temp_song_{uuid.uuid4()}.{song_file.filename.rsplit('.', 1)[1].lower()}"
        song_path = OUTPUT_FOLDER / song_filename
        song_file.save(song_path)
        
        print(f"\n[API] Song conversion request:")
        print(f"[API]   Voice: {voice_id} ({voice_record['name']})")
        print(f"[API]   Language: {language}")
        print(f"[API]   Effects: {add_effects}")
        print(f"[API]   Song: {song_path}")
        
        # Process song
        try:
            from app.song_conversion.song_processor import SongProcessor
            
            processor = SongProcessor(models_dir=MODELS_DIR)
            
            output_filename = f"converted_song_{uuid.uuid4()}.wav"
            output_path = OUTPUT_FOLDER / output_filename
            
            result_path = processor.convert_song(
                song_path=song_path,
                voice_path=voice_path,
                output_path=output_path,
                language=language,
                add_effects=add_effects,
                models_dir=MODELS_DIR
            )
            
            # Clean up temp song file
            try:
                song_path.unlink()
            except Exception as e:
                print(f"[API] Warning: Failed to clean temp song: {e}")
            
            print(f"[API] Conversion successful: {result_path}")
            
            return jsonify({
                'status': 'success',
                'audio_url': f'/api/audio/{output_filename}',
                'filename': output_filename
            }), 200
            
        except ImportError as ie:
            return jsonify({'error': f'Song conversion module not available: {str(ie)}'}), 500
        except Exception as e:
            print(f"[API] Conversion error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Song conversion failed: {str(e)}'}), 500
    
    except Exception as e:
        print(f"[API] Unexpected error in /convert_song: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@bp.route('/separate_vocals', methods=['POST'])
def separate_vocals():
    """
    Separate vocals from instrumental (for preview/debugging).
    
    Args (form data):
        song: MP3/WAV/M4A/FLAC file
    
    Returns:
        {
            "status": "success",
            "vocal_url": "/api/audio/vocals_[uuid].wav",
            "instrumental_url": "/api/audio/instrumental_[uuid].wav"
        }
    """
    try:
        # Validate request
        if 'song' not in request.files:
            return jsonify({'error': 'No song file provided'}), 400
        
        song_file = request.files['song']
        
        # Validate file
        if song_file.filename == '':
            return jsonify({'error': 'No song file selected'}), 400
        
        if not allowed_file(song_file.filename):
            return jsonify({'error': f'Unsupported file format. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Save uploaded song temporarily
        song_filename = f"temp_song_{uuid.uuid4()}.{song_file.filename.rsplit('.', 1)[1].lower()}"
        song_path = OUTPUT_FOLDER / song_filename
        song_file.save(song_path)
        
        print(f"\n[API] Vocal separation request for: {song_path}")
        
        # Process song
        try:
            from app.song_conversion.vocal_separator import VocalSeparator
            import soundfile as sf
            
            separator = VocalSeparator(model_name="htdemucs")
            
            vocal_filename = f"vocals_{uuid.uuid4()}.wav"
            instrumental_filename = f"instrumental_{uuid.uuid4()}.wav"
            
            vocal_path = OUTPUT_FOLDER / vocal_filename
            instrumental_path = OUTPUT_FOLDER / instrumental_filename
            
            separator.separate_and_save(
                song_path,
                vocal_path,
                instrumental_path,
                sr=16000
            )
            
            # Clean up temp song file
            try:
                song_path.unlink()
            except Exception as e:
                print(f"[API] Warning: Failed to clean temp song: {e}")
            
            print(f"[API] Separation successful:")
            print(f"[API]   Vocals: {vocal_path}")
            print(f"[API]   Instrumental: {instrumental_path}")
            
            return jsonify({
                'status': 'success',
                'vocal_url': f'/api/audio/{vocal_filename}',
                'instrumental_url': f'/api/audio/{instrumental_filename}'
            }), 200
            
        except ImportError as ie:
            return jsonify({'error': f'Vocal separator not available: {str(ie)}'}), 500
        except Exception as e:
            print(f"[API] Separation error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Vocal separation failed: {str(e)}'}), 500
    
    except Exception as e:
        print(f"[API] Unexpected error in /separate_vocals: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


