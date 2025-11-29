/**
 * API configuration and utilities
 * Handles all communication with the backend with split endpoints for English and Hindi
 */

// Get base URLs for each language
const API_ENGLISH_URL = import.meta.env.VITE_API_URL_ENGLISH || 'http://localhost:5000';
const API_HINDI_URL = import.meta.env.VITE_API_URL_HINDI || 'http://localhost:5001';

// Default fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || API_ENGLISH_URL;

/**
 * Get the appropriate API URL based on language
 */
const getApiUrlForLanguage = (language: string = 'english'): string => {
  if (language.toLowerCase() === 'hindi') {
    return API_HINDI_URL;
  }
  return API_ENGLISH_URL;
};

export const api = {
  /**
   * Get the full API URL for an endpoint
   * Optionally routes to language-specific backend
   */
  getUrl: (endpoint: string, language: string = 'english') => {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = getApiUrlForLanguage(language);
    return `${baseUrl}/api${path}`;
  },

  /**
   * Fetch voices list
   */
  fetchVoices: async (language: string = 'english') => {
    const response = await fetch(api.getUrl('/voices', language));
    if (!response.ok) throw new Error('Failed to fetch voices');
    return response.json();
  },

  /**
   * Enroll a voice with audio file
   */
  enrollVoice: async (formData: FormData, language: string = 'english') => {
    const response = await fetch(api.getUrl('/enroll', language), {
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
   * Routes to language-specific backend
   */
  synthesize: async (voiceId: string, text: string, language: string = 'english') => {
    const response = await fetch(api.getUrl('/synthesize', language), {
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
   * Get audio URL (defaults to English backend, but can accept language param)
   */
  getAudioUrl: (audioPath: string, language: string = 'english') => {
    if (audioPath.startsWith('http')) {
      return audioPath; // Already a full URL
    }
    const baseUrl = getApiUrlForLanguage(language);
    if (audioPath.startsWith('/api')) {
      return `${baseUrl}${audioPath}`;
    }
    return `${baseUrl}/api/audio/${audioPath}`;
  },
};

export default api;
