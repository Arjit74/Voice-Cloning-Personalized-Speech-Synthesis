import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, Brain, Globe, Zap, Users, Sparkles, Sun, Moon, ArrowDown } from 'lucide-react';
import VoiceEnrollment from '@/components/forms/VoiceEnrollment';
import SpeechSynthesis from '@/components/forms/SpeechSynthesis';
import ParticleField from '@/components/three/ParticleField';
import FloatingElements from '@/components/three/FloatingElements';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import Spline from '@splinetool/react-spline';

interface Voice {
  id: string;
  name: string;
  audioUrl?: string;
  createdAt: string;
}

const Index = () => {
  const [enrolledVoices, setEnrolledVoices] = useState<Voice[]>([]);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light' | null);
    const initial = saved ?? 'dark';
    setTheme(initial);
    document.documentElement.classList.toggle('light', initial === 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
    localStorage.setItem('theme', next);
  };

  const handleVoiceEnrollment = (voiceData: Voice) => {
    setEnrolledVoices(prev => [...prev, voiceData]);
  };

  const handleSynthesisComplete = (audioUrl: string) => {
    console.log('Synthesis completed:', audioUrl);
  };

  // Demo info - no backend required to test
  const showDemoInfo = () => {
    toast({
      title: "Demo ready",
      description: "This demo runs fully in your browser. Use Voice Enrollment to add a sample voice and Speech Synthesis to generate audio.",
      duration: 5000
    });
    const enrollTab = document.querySelector('[value="enroll"]') as HTMLElement | null;
    enrollTab?.click();
    enrollTab?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  
  return (
    <div className="min-h-screen bg-background">
      {/* Light theme site-wide gradient background overlay */}
      <div className={`fixed inset-0 -z-10 pointer-events-none transition-opacity ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 10%, rgba(99,102,241,0.12), transparent 30%), radial-gradient(circle at 80% 30%, rgba(59,130,246,0.10), transparent 35%), linear-gradient(180deg, #ffffff, #f8fafc)'
          }}
        />
      </div>
      {/* Theme Toggle - Moved to bottom right corner */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={toggleTheme} className="glass-effect">
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
      {/* 3D Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-background">
              <div className="animate-pulse text-muted-foreground">Loading 3D Experience...</div>
            </div>
          }>
            <div className="w-full h-full" style={{ position: 'relative', overflow: 'hidden' }}>
              <Spline 
                scene="https://prod.spline.design/29Tapg2-bsw8cBkJ/scene.splinecode"
                className="w-full h-full"
                onLoad={(spline: any) => {
                  try {
                    // Align the camera to face the user and center the scene
                    const cam =
                      spline.findObjectByName?.('Personal Camera') ||
                      spline.findObjectByName?.('Camera') ||
                      spline.findObjectByName?.('Main Camera') ||
                      spline.findObjectByName?.('camera') ||
                      spline.findObjectByName?.('Perspective Camera');

                    if (cam) {
                      // Shift view left: move camera to the right along X, keep Y/Z and rotation intact
                      cam.position.x = (cam.position?.x ?? 0) + 300;
                    }
                  } catch (e) {
                    console.warn('Spline camera adjust failed:', e);
                  }

                  // Keep default zoom level for the intended view
                  if (spline.setZoom) spline.setZoom(1);
                }}
              />
              <style dangerouslySetInnerHTML={{
                __html: `
                  .spline-watermark,
                  .spline-credits,
                  .spline-toolbar {
                    display: none !important;
                  }

                  /* Ensure no CSS tilt is applied */
                  .spline-container,
                  .spline-canvas {
                    transform: none !important;
                  }
                `
              }} />
                          </div>
          </Suspense>
        </div>
      </section>

      {/* Main Content */}
      <main id="main-content" className="relative z-10">
        {/* Features Section with Spline Background */}
        <section className="py-16 px-4 relative">
        {/* Spline Background Scene */}
        <div className="absolute inset-0 opacity-30">
          <ParticleField isActive={false} colorMode={theme} className="opacity-20" />
        </div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">Powerful Features</h2>
            <p className="text-lg text-muted-foreground animate-slide-up">Advanced voice technology at your fingertips</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-effect hover:bg-surface-elevated transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-4 glow-primary">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Voice Enrollment</CardTitle>
                <CardDescription>
                  Record or upload audio samples to create personalized voice profiles with real-time feedback
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-effect hover:bg-surface-elevated transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader>
                <div className="w-16 h-16 bg-accent/20 rounded-xl flex items-center justify-center mb-4 glow-accent">
                  <Globe className="w-8 h-8 text-accent" />
                </div>
                <CardTitle>Bilingual Support</CardTitle>
                <CardDescription className="hindi-text">
                  Full support for English and Hindi (हिंदी) text processing with advanced language detection
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-effect hover:bg-surface-elevated transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader>
                <div className="w-16 h-16 bg-primary-glow/20 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-primary-glow" />
                </div>
                <CardTitle>Real-time Synthesis</CardTitle>
                <CardDescription>
                  Convert text to natural-sounding speech using your enrolled voices with AI-powered processing
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      
      {/* Main Application with Enhanced Visuals */}
      <section className="py-16 px-4 relative">
                
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Voice Cloning Studio</h2>
            <p className="text-lg text-muted-foreground">
              Enroll your voice and start creating personalized speech with cutting-edge 3D visualization
            </p>
          </div>

          <Tabs defaultValue="enroll" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="enroll" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Voice Enrollment</span>
              </TabsTrigger>
              <TabsTrigger value="synthesize" className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>Speech Synthesis</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enroll" className="space-y-6">
              <VoiceEnrollment onEnrollmentComplete={handleVoiceEnrollment} />
              
              {/* Enrolled Voices List */}
              {enrolledVoices.length > 0 && (
                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle>Your Enrolled Voices</CardTitle>
                    <CardDescription>
                      {enrolledVoices.length} voice{enrolledVoices.length !== 1 ? 's' : ''} enrolled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Map through enrolled voices here */}
                      {enrolledVoices.map((voice) => (
                        <div key={voice.id} className="border rounded-lg p-4">
                          <h4 className="font-medium">{voice.name}</h4>
                          {voice.audioUrl && (
                            <audio src={voice.audioUrl} controls className="w-full mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="synthesize" className="space-y-6">
              <SpeechSynthesis 
                voices={enrolledVoices.length ? enrolledVoices : undefined}
                onSynthesisComplete={handleSynthesisComplete} 
              />
              
              {enrolledVoices.length === 0 && (
                <Card className="glass-effect border-dashed border-accent/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Mic className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No voices enrolled</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Enroll your voice first to enable speech synthesis
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const enrollTab = document.querySelector('[value="enroll"]') as HTMLElement;
                        enrollTab?.click();
                      }}
                    >
                      Go to Voice Enrollment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
        </section>
      </main>
    </div>
  );
};

export default Index;