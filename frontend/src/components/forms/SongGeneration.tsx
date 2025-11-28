import React, { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Upload, Music, Loader2 } from 'lucide-react'

interface Voice {
  id: string
  name: string
  createdAt: string
}

interface SongGenerationProps {
  voices: Voice[]
  language: 'english' | 'hindi'
  onLanguageChange: (lang: 'english' | 'hindi') => void
}

export const SongGeneration: React.FC<SongGenerationProps> = ({
  voices,
  language,
  onLanguageChange,
}) => {
  const [songFile, setSongFile] = useState<File | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || '')
  const [addEffects, setAddEffects] = useState(true)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputAudio, setOutputAudio] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSongSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac'].includes(file.type)) {
        setError('Please select a valid audio file (MP3, WAV, M4A, FLAC)')
        setSongFile(null)
        return
      }
      setSongFile(file)
      setError(null)
    }
  }

  const handleConvertSong = async () => {
    if (!songFile) {
      setError('Please select a song file')
      return
    }

    if (!selectedVoice) {
      setError('Please select an enrolled voice')
      return
    }

    setIsConverting(true)
    setProgress(0)
    setError(null)
    setSuccessMessage(null)

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 2000)

      const formData = new FormData()
      formData.append('song', songFile)
      formData.append('voice_id', selectedVoice)
      formData.append('language', language)
      formData.append('add_effects', addEffects ? 'true' : 'false')

      console.log('Converting song with:', {
        voice: selectedVoice,
        language,
        addEffects,
      })

      const response = await fetch(`${API_BASE_URL}/api/convert_song`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const audioUrl = `${API_BASE_URL}${result.audio_url}`
        setOutputAudio(audioUrl)
        setSuccessMessage('✅ Song converted successfully! Your voice is now in the song.')
        setSongFile(null)
        setProgress(0)
      } else {
        throw new Error(result.error || 'Conversion failed')
      }
    } catch (err) {
      console.error('Song conversion error:', err)
      setError(err instanceof Error ? err.message : 'Failed to convert song')
      setProgress(0)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Language Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => onLanguageChange('english')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            language === 'english'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🇬🇧 English
        </button>
        <button
          onClick={() => onLanguageChange('hindi')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            language === 'hindi'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🇮🇳 हिन्दी
        </button>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Music className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>How it works:</strong> Upload a song → Select your enrolled voice → 
          Your voice will replace the original singer! (Quality: 6-7/10, Processing time: 6-10 min)
        </AlertDescription>
      </Alert>

      {/* Song Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          📁 Upload Song File (MP3, WAV, M4A, FLAC)
        </label>
        <div className="relative">
          <input
            type="file"
            accept="audio/*"
            onChange={handleSongSelect}
            disabled={isConverting}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 disabled:opacity-50"
          />
          <Upload className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        </div>
        {songFile && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Song selected: {songFile.name} ({(songFile.size / 1024 / 1024).toFixed(1)}MB)
          </p>
        )}
      </div>

      {/* Voice Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          🎤 Select Enrolled Voice
        </label>
        {voices.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No voices enrolled. Please enroll a voice first.</p>
        ) : (
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={isConverting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="">-- Select a voice --</option>
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} (Added {new Date(voice.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Effects Toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="addEffects"
          checked={addEffects}
          onChange={(e) => setAddEffects(e.target.checked)}
          disabled={isConverting}
          className="w-4 h-4 cursor-pointer"
        />
        <label htmlFor="addEffects" className="flex-1 text-sm font-medium text-gray-700 cursor-pointer">
          ✨ Add Effects (Reverb & Compression)
        </label>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {isConverting && progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 font-medium">Converting...</span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Convert Button */}
      <button
        onClick={handleConvertSong}
        disabled={!songFile || !selectedVoice || isConverting}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isConverting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Converting Your Song...
          </>
        ) : (
          <>
            <Music className="h-5 w-5" />
            🎬 Convert Song to My Voice
          </>
        )}
      </button>

      {/* Output Audio */}
      {outputAudio && (
        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900">🎉 Your Song is Ready!</h3>
          <audio
            controls
            src={outputAudio}
            className="w-full rounded-lg"
          />
          <a
            href={outputAudio}
            download="converted_song.wav"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            📥 Download Song
          </a>
        </div>
      )}

      {/* Quality Info */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <strong>⚠️ Quality Note:</strong> Output is AI-processed (6-7/10 quality). 
        Works best with pop/rock songs. Enable effects for better sound!
      </div>
    </div>
  )
}
