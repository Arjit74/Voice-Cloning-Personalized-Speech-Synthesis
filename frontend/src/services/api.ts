/**
 * API configuration and utilities
 * Handles all communication with the backend
 */

// Use environment variable or default to localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = {
  /**
   * Get the full API URL for an endpoint
   */
  getUrl: (endpoint: string) => {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}/api${path}`;
  },

  /**
   * Fetch voices list
   */
  fetchVoices: async () => {
    const response = await fetch(api.getUrl('/voices'));
    if (!response.ok) throw new Error('Failed to fetch voices');
    return response.json();
  },

  /**
   * Enroll a voice with audio file
   */
  enrollVoice: async (formData: FormData) => {
    const response = await fetch(api.getUrl('/enroll'), {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enroll voice');
    }
    return response.json();
  },

  /**
   * Synthesize speech from text (supports multilingual: english, hindi)
   */
  synthesize: async (voiceId: string, text: string, language: string = 'english') => {
    const response = await fetch(api.getUrl('/synthesize'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text: text,
        language: language,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to synthesize speech');
    }
    return response.json();
  },

  /**
   * Get spectrogram data for audio file
   */
  getSpectrogram: async (filename: string) => {
    const response = await fetch(api.getUrl(`/spectrogram/${filename}`));
    if (!response.ok) throw new Error('Failed to fetch spectrogram');
    return response.json();
  },

  /**
   * Get audio file
   */
  getAudio: async (filename: string) => {
    const response = await fetch(api.getUrl(`/audio/${filename}`));
    if (!response.ok) throw new Error('Failed to fetch audio');
    return response.arrayBuffer();
  },

  /**
   * Delete voice
   */
  deleteVoice: async (voiceId: string) => {
    const response = await fetch(api.getUrl(`/voices/${voiceId}`), {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete voice');
    return response.json();
  },

  /**
   * Get audio URL
   */
  getAudioUrl: (audioPath: string) => {
    if (audioPath.startsWith('http')) {
      return audioPath; // Already a full URL
    }
    if (audioPath.startsWith('/api')) {
      return `${API_BASE_URL}${audioPath}`;
    }
    return `${API_BASE_URL}/api/audio/${audioPath}`;
  },
};

export default api;
