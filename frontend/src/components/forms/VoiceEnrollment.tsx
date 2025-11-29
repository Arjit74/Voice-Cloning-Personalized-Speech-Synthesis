import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import AudioRecorder from '../audio/AudioRecorder';

interface VoiceEnrollmentProps {
  onEnrollmentComplete?: (voiceData: any) => void;
  className?: string;
}

export default function VoiceEnrollment({ onEnrollmentComplete, className = "" }: VoiceEnrollmentProps) {
  const [voiceName, setVoiceName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollmentLanguage, setEnrollmentLanguage] = useState<'english' | 'hindi'>('english');
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setSelectedFile(file);
        setRecordedAudio(null); // Clear recorded audio if file is selected
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an audio file (.mp3, .wav, .m4a, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    setRecordedAudio({ blob: audioBlob, url: audioUrl });
    setSelectedFile(null); // Clear file selection if recording is made
  };

  const handleEnrollment = async () => {
    if (!voiceName.trim()) {
      toast({
        title: "Voice name required",
        description: "Please enter a name for this voice",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile && !recordedAudio) {
      toast({
        title: "No audio provided",
        description: "Please either upload an audio file or record your voice",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Prepare form data for API call
      const formData = new FormData();
      formData.append('voice_name', voiceName);
      
      if (selectedFile) {
        formData.append('audio', selectedFile);
      } else if (recordedAudio) {
        // Convert blob to file
        const file = new File([recordedAudio.blob], `${voiceName}.wav`, { type: 'audio/wav' });
        formData.append('audio', file);
      }

      // Call backend API with language selection
      const result = await api.enrollVoice(formData, enrollmentLanguage);

      const voiceData = {
        id: result.voice_id,
        name: voiceName,
        audioData: selectedFile || recordedAudio?.blob,
        audioUrl: selectedFile ? URL.createObjectURL(selectedFile) : recordedAudio?.url,
        createdAt: new Date().toISOString()
      };

      onEnrollmentComplete?.(voiceData);

      toast({
        title: "Voice enrolled successfully!",
        description: `Voice "${voiceName}" has been added to your collection`
      });

      // Reset form
      setVoiceName('');
      setSelectedFile(null);
      setRecordedAudio(null);

    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        title: "Enrollment failed",
        description: error instanceof Error ? error.message : "There was an error enrolling your voice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={`glass-effect ${className}`}>
      <CardHeader>
        <CardTitle className="gradient-text">Enroll Your Voice</CardTitle>
        <CardDescription>
          Create a voice profile by uploading an audio file or recording directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <Label>Store Voice For</Label>
          <div className="flex gap-4">
            <Button
              variant={enrollmentLanguage === 'english' ? 'default' : 'outline'}
              onClick={() => setEnrollmentLanguage('english')}
              className="flex-1"
            >
              English
            </Button>
            <Button
              variant={enrollmentLanguage === 'hindi' ? 'default' : 'outline'}
              onClick={() => setEnrollmentLanguage('hindi')}
              className="flex-1"
            >
              हिंदी (Hindi)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {enrollmentLanguage === 'english' 
              ? 'Voice will be available for English synthesis' 
              : 'Voice will be available for Hindi synthesis'}
          </p>
        </div>

        {/* Voice Name Input */}
        <div className="space-y-2">
          <Label htmlFor="voice-name">Voice Name</Label>
          <Input
            id="voice-name"
            type="text"
            placeholder="e.g., My Voice, Professional Tone, etc."
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className="bg-surface border-border"
          />
        </div>

        {/* Audio Input Tabs */}
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record" className="flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Record</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-4">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            {recordedAudio && (
              <div className="text-center text-sm text-muted-foreground">
                ✓ Recording completed
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="audio-upload" className="cursor-pointer">
                <span className="text-lg font-medium">Choose audio file</span>
                <p className="text-sm text-muted-foreground mt-2">
                  Supports MP3, WAV, M4A and other audio formats
                </p>
              </Label>
              <Input
                id="audio-upload"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {selectedFile && (
              <div className="text-center text-sm text-muted-foreground">
                ✓ Selected: {selectedFile.name}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Enrollment Button */}
        <Button
          onClick={handleEnrollment}
          disabled={isUploading || !voiceName.trim() || (!selectedFile && !recordedAudio)}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 glow-primary"
        >
          {isUploading ? 'Enrolling Voice...' : 'Enroll Voice'}
        </Button>
      </CardContent>
    </Card>
  );
}