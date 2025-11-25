import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, Volume2, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SpeakerScene from '../three/SpeakerScene';
import AudioWaveform from '../audio/AudioWaveform';
import MelSpectrogramVisualizer from '../audio/MelSpectrogramVisualizer';
import ProcessingPipeline from '../audio/ProcessingPipeline';
import FFTVisualizer from '../audio/FFTVisualizer';
import RealTimeStatsDashboard from '../audio/RealTimeStatsDashboard';

interface Voice {
  id: string;
  name: string;
  audioUrl?: string;
}

interface SpeechSynthesisProps {
  voices?: Voice[];
  onSynthesisComplete?: (audioUrl: string) => void;
  className?: string;
}

// Sample texts for different languages
const sampleTexts = {
  english: "Hello, this is a sample text for speech synthesis. The technology can convert this text into natural-sounding speech.",
  hindi: "नमस्ते, यह स्पीच सिंथेसिस के लिए एक नमूना टेक्स्ट है। यह तकनीक इस टेक्स्ट को प्राकृतिक आवाज़ में बदल सकती है।",
  mixed: "Hello दोस्तों, this is a mixed language example. आज हम speech synthesis के बारे में बात करेंगे।"
};

export default function SpeechSynthesis({ 
  voices: propVoices,
  onSynthesisComplete,
  className = "" 
}: SpeechSynthesisProps) {
  const [inputText, setInputText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [synthesizedAudio, setSynthesizedAudio] = useState<string>('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<Voice[]>(propVoices || []);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);
  const [audioFilename, setAudioFilename] = useState<string>('');
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);
  const [synthesizerStartTime, setSynthesizerStartTime] = useState<number | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Don't set default text - let user type their own
    // Load voices from backend
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const response = await fetch('http://localhost:5000/api/voices');
      if (response.ok) {
        const data = await response.json();
        const loadedVoices = data.voices.map((v: any) => ({
          id: v.id,
          name: v.name,
          audioUrl: v.path
        }));
        setVoices(loadedVoices);
        console.log('Loaded voices:', loadedVoices); // Debug log
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSampleTextSelect = (type: keyof typeof sampleTexts) => {
    setInputText(sampleTexts[type]);
  };

  const handleSynthesize = async () => {
    console.log('Synthesize clicked - Voice:', selectedVoice, 'Text:', inputText); // Debug log
    
    if (!inputText.trim()) {
      toast({
        title: "No text provided",
        description: "Please enter some text to synthesize",
        variant: "destructive"
      });
      return;
    }

    if (!selectedVoice) {
      toast({
        title: "No voice selected",
        description: "Please select a voice for synthesis",
        variant: "destructive"
      });
      return;
    }

    setIsSynthesizing(true);
    setSpectrogramData([]); // Reset spectrogram
    setSynthesizerStartTime(Date.now()); // Record synthesis start time

    try {
      // Call backend API for synthesis
      const response = await fetch('http://localhost:5000/api/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voice_id: selectedVoice,
          text: inputText
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to synthesize speech');
      }

      const result = await response.json();
      
      // Get the audio file URL from backend with cache busting
      const audioUrl = `http://localhost:5000${result.audio_url}?t=${Date.now()}`;
      
      // Extract filename from audio_url (e.g., "/api/audio/synthesis_abc123.wav" -> "synthesis_abc123.wav")
      const filename = result.audio_url.split('/').pop() || '';
      setAudioFilename(filename); // Store filename for mel-spectrogram real-time fetching
      
      // Fetch mel-spectrogram data after synthesis
      if (filename) {
        try {
          const spectrogramResponse = await fetch(
            `http://localhost:5000/api/spectrogram/${filename}`
          );
          if (spectrogramResponse.ok) {
            const spectrogramResult = await spectrogramResponse.json();
            setSpectrogramData(spectrogramResult.spectrogram);
            console.log('Spectrogram data loaded:', spectrogramResult);
          }
        } catch (err) {
          console.warn('Could not load spectrogram data:', err);
          // Continue without spectrogram data
        }
      }
      
      // Reset audio element to force reload
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        setAudioElement(null);
      }
      
      setSynthesizedAudio(audioUrl);
      setIsPlaying(false);
      onSynthesisComplete?.(audioUrl);

      toast({
        title: "Synthesis complete!",
        description: "Your text has been converted to speech"
      });

    } catch (error) {
      console.error('Synthesis error:', error);
      toast({
        title: "Synthesis failed",
        description: error instanceof Error ? error.message : "There was an error generating the speech. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSynthesizing(false);
      setSynthesizerStartTime(null); // Reset start time when synthesis ends
    }
  };

  const handlePlay = () => {
    if (!synthesizedAudio) return;

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(synthesizedAudio);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
      setAudioElement(audio);
    }
  };

  const handleDownload = () => {
    if (synthesizedAudio) {
      const a = document.createElement('a');
      a.href = synthesizedAudio;
      a.download = `synthesis-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const detectLanguage = (text: string) => {
    const hindiRegex = /[\u0900-\u097F]/;
    const hasHindi = hindiRegex.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    
    if (hasHindi && hasEnglish) return 'Mixed (English + Hindi)';
    if (hasHindi) return 'Hindi';
    if (hasEnglish) return 'English';
    return 'Unknown';
  };

  return (
    <>
      <Card className={`glass-effect ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="gradient-text">Speech Synthesis</CardTitle>
            <CardDescription>
              Convert text to speech using your enrolled voices
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowStatsDashboard(true)}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Show real-time synthesis dashboard"
          >
            <Activity className="w-4 h-4" />
            Dashboard
          </Button>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select">Select Voice</Label>
          <Select value={selectedVoice} onValueChange={(value) => {
            console.log('Voice selected:', value); // Debug log
            setSelectedVoice(value);
          }}>
            <SelectTrigger className="bg-surface border-border">
              <SelectValue placeholder="Choose a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>{voice.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="input-text">Text to Synthesize</Label>
            <Badge variant="outline">
              {detectLanguage(inputText)}
            </Badge>
          </div>
          <Textarea
            id="input-text"
            placeholder="Enter your text here... (English and Hindi supported)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[120px] bg-surface border-border hindi-text"
            maxLength={1000}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="text-sm text-muted-foreground text-right">
            {inputText.length}/1000 characters
          </div>
        </div>

        {/* Sample Text Buttons */}
        <div className="space-y-2">
          <Label>Sample Texts</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSampleTextSelect('english')}
            >
              English Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSampleTextSelect('hindi')}
              className="hindi-text"
            >
              हिंदी नमूना
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSampleTextSelect('mixed')}
            >
              Mixed Language
            </Button>
          </div>
        </div>

        {/* 3D Speaker and Synthesis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="w-full h-48 rounded-xl overflow-hidden">
            <SpeakerScene isPlaying={isSynthesizing || isPlaying} />
          </div>
          
          <div className="space-y-4">
            {/* Mel-Spectrogram Visualization */}
            <MelSpectrogramVisualizer 
              isActive={isSynthesizing}
              spectrogramData={spectrogramData}
              audioFilename={audioFilename}
            />

            {/* FFT Spectrum Analyzer */}
            <FFTVisualizer 
              isActive={isSynthesizing}
              audioFilename={audioFilename}
              synthesizerStartTime={synthesizerStartTime}
            />

            {/* Processing Pipeline */}
            <ProcessingPipeline 
              isActive={isSynthesizing}
              synthesizerStartTime={synthesizerStartTime}
            />

            {/* Waveform Visualization */}
            <div className="h-16 flex items-center justify-center">
              <AudioWaveform 
                isPlaying={isSynthesizing || isPlaying}
                bars={15}
              />
            </div>

            {/* Synthesis Button */}
            <Button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !inputText.trim() || !selectedVoice}
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 glow-accent"
            >
              {isSynthesizing ? 'Synthesizing...' : 'Generate Speech'}
            </Button>
            {/* Debug info */}
            <div className="text-xs text-muted-foreground text-center">
              {!selectedVoice && <span>⚠ No voice selected</span>}
              {!inputText.trim() && <span>⚠ No text entered</span>}
            </div>
          </div>
        </div>

        {/* Audio Controls */}
        {synthesizedAudio && !isSynthesizing && (
          <div className="flex items-center justify-center space-x-4 p-4 bg-surface rounded-lg">
            <Button onClick={handlePlay} size="lg">
              {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    <RealTimeStatsDashboard
      isOpen={showStatsDashboard}
      onOpenChange={setShowStatsDashboard}
      synthesizerStartTime={synthesizerStartTime}
      isSynthesizing={isSynthesizing}
      currentVoiceName={voices.find(v => v.id === selectedVoice)?.name || 'Current Voice'}
      enrolledVoiceCount={voices.length}
    />
    </>
  );
}