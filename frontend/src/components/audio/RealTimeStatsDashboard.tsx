import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RealTimeStatsDashboardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  synthesizerStartTime: number | null;
  isSynthesizing: boolean;
  currentVoiceName?: string;
  enrolledVoiceCount?: number;
}

export default function RealTimeStatsDashboard({
  isOpen,
  onOpenChange,
  synthesizerStartTime,
  isSynthesizing,
  currentVoiceName = 'Current Voice',
  enrolledVoiceCount = 5
}: RealTimeStatsDashboardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const animationFrameRef = useRef<number>();

  // Update elapsed time in real-time
  useEffect(() => {
    const updateElapsed = () => {
      if (synthesizerStartTime && isSynthesizing) {
        const elapsed = (Date.now() - synthesizerStartTime) / 1000;
        setElapsedSeconds(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateElapsed);
      } else {
        setElapsedSeconds(0);
      }
    };

    if (isOpen && isSynthesizing) {
      animationFrameRef.current = requestAnimationFrame(updateElapsed);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, isSynthesizing, synthesizerStartTime]);

  // Stage timing configuration
  const stages = [
    { name: 'Speaker Encoder', duration: 3, startTime: 0, color: '#ff6b6b' },
    { name: 'Tacotron2 Synthesizer', duration: 45, startTime: 3, color: '#4ecdc4' },
    { name: 'WaveRNN Vocoder', duration: 12, startTime: 48, color: '#45b7d1' }
  ];

  // Calculate metrics based on actual elapsed time
  const getStageProgress = (stage: typeof stages[0]) => {
    if (elapsedSeconds < stage.startTime) {
      return 0;
    } else if (elapsedSeconds >= stage.startTime && elapsedSeconds < stage.startTime + stage.duration) {
      const stageElapsed = elapsedSeconds - stage.startTime;
      return Math.min(99, (stageElapsed / stage.duration) * 100);
    } else {
      return 100;
    }
  };

  // Simulated CPU and memory (would come from backend in production)
  const cpuUsage = Math.min(95, Math.max(10, 50 + Math.sin(elapsedSeconds) * 30));
  const memoryUsage = Math.min(90, Math.max(20, 60 + Math.cos(elapsedSeconds * 0.5) * 20));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Real-Time Synthesis Dashboard</DialogTitle>
          <DialogDescription>
            Synthesis progress and system metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            {stages.map((stage) => {
              const progress = getStageProgress(stage);
              return (
                <Card key={stage.name} className="bg-surface border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{stage.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: stage.color
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {progress < 100
                        ? `${stage.startTime}s - ${stage.startTime + stage.duration}s`
                        : 'Completed'}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-mono text-accent">{Math.round(cpuUsage)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${cpuUsage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-mono text-primary-glow">{Math.round(memoryUsage)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-glow transition-all duration-300"
                    style={{ width: `${memoryUsage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Elapsed Time Display */}
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Elapsed Time</span>
                <span className="text-2xl font-mono font-bold text-primary">
                  {elapsedSeconds.toFixed(1)}s
                </span>
              </div>
            </CardContent>
          </Card>

          {isSynthesizing && (
            <div className="text-center text-xs text-green-400 animate-pulse">
              ● Synthesis in progress...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
