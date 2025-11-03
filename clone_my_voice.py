"""
Simple Voice Cloning Script
============================
Just edit the settings below and run this file!

Usage:
    python clone_my_voice.py
"""

from pathlib import Path
import sys
from run_cli import synthesize

# ============================================================================
# EDIT THESE SETTINGS
# ============================================================================

# Your voice sample file (WAV, MP3, etc.)
VOICE_FILE = r"sample\Recording.mp3"

# The text you want to be spoken in your voice
TEXT_TO_CLONE = """
This is a text which we would like to clone. Hurray!!
"""

# Where to save the output (optional - default is outputs/cloned_voice.wav)
OUTPUT_FILE = r"outputs\cloned_voice.wav"

# ============================================================================
# NO NEED TO EDIT BELOW THIS LINE
# ============================================================================

def print_header():
    """Print a nice header"""
    print("\n" + "=" * 70)
    print("   VOICE CLONING SYSTEM")
    print("=" * 70)


def print_config():
    """Print the configuration"""
    print("\n Configuration:")
    print("-" * 70)
    print(f"  Voice Sample : {VOICE_FILE}")
    print(f"  Output File  : {OUTPUT_FILE}")
    print(f"  Text Length  : {len(TEXT_TO_CLONE.strip())} characters")
    print("-" * 70)


def print_text_preview():
    """Print a preview of the text"""
    text = TEXT_TO_CLONE.strip()
    preview = text[:150] + "..." if len(text) > 150 else text
    print(f"\n Text Preview:")
    print("-" * 70)
    print(f"  {preview}")
    print("-" * 70)


def validate_inputs():
    """Validate that all inputs are correct"""
    voice_path = Path(VOICE_FILE)
    
    if not voice_path.exists():
        print("\n ERROR: Voice file not found!")
        print(f"   Looking for: {voice_path.absolute()}")
        print("\n Tip: Check the VOICE_FILE path in this script")
        return False
    
    if not TEXT_TO_CLONE.strip():
        print("\n ERROR: No text provided!")
        print(" Tip: Add text to the TEXT_TO_CLONE variable")
        return False
    
    return True


def main():
    """Main function to run voice cloning"""
    print_header()
    print_config()
    print_text_preview()
    
    # Validate inputs
    if not validate_inputs():
        input("\nPress Enter to exit...")
        return 1
    
    # Prepare paths
    voice_path = Path(VOICE_FILE)
    out_path = Path(OUTPUT_FILE)
    models_dir = Path("models")
    
    print("\n Starting voice cloning...")
    print("=" * 70)
    print(" Loading models and processing... (this may take 20-60 seconds)")
    print("-" * 70)
    
    try:
        # Run the synthesis
        result = synthesize(
            voice_path,
            TEXT_TO_CLONE.strip(),
            models_dir,
            out_path
        )
        
        # Success message
        print("\n" + "=" * 70)
        print(" SUCCESS! Voice cloning completed!")
        print("=" * 70)
        print(f"\n Output saved to:")
        print(f"   {result.absolute()}")
        print("\n You can play it with:")
        print(f"   start {result}")
        print("\n" + "=" * 70)
        
        return 0
        
    except Exception as e:
        print("\n" + "=" * 70)
        print(" ERROR occurred during voice cloning:")
        print("=" * 70)
        print(f"\n{type(e).__name__}: {e}")
        print("\n Common issues:")
        print("   • Synthesizer model not properly downloaded (should be 370 MB)")
        print("   • Voice file is corrupted or in unsupported format")
        print("   • Not enough disk space for output")
        print("\n" + "=" * 70)
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
    except KeyboardInterrupt:
        print("\n\n Interrupted by user")
        exit_code = 1
    
    input("\nPress Enter to exit...")
    sys.exit(exit_code)
