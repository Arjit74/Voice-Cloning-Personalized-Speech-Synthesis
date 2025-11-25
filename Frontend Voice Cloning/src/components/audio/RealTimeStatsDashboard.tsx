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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Draw embedding space visualization
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw enrolled voices as clusters
    const numEnrolledVoices = Math.max(enrolledVoiceCount, 3);
    for (let i = 0; i < numEnrolledVoices; i++) {
      const angle = (i / numEnrolledVoices) * Math.PI * 2;
      const radius = 80;
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;

      // Draw voice cluster circle
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
      ctx.fillStyle = colors[i % colors.length] + '60';
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw voice dot
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Voice ${i + 1}`, x, y + 45);
    }

    // Draw current voice (animated around the circle)
    const time = elapsedSeconds;
    const currentAngle = (time * 2) % (Math.PI * 2);
    const currentRadius = 120;
    const currentX = width / 2 + Math.cos(currentAngle) * currentRadius;
    const currentY = height / 2 + Math.sin(currentAngle) * currentRadius;

    // Highlight circle
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Current voice point
    ctx.fillStyle = 'rgba(0, 255, 100, 0.9)';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 50, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(0, 255, 100, 0.9)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentVoiceName, currentX, currentY - 60);

    // Draw distance lines to nearby voices
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < numEnrolledVoices; i++) {
      const angle = (i / numEnrolledVoices) * Math.PI * 2;
      const radius = 80;
      const voiceX = width / 2 + Math.cos(angle) * radius;
      const voiceY = height / 2 + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(voiceX, voiceY);
      ctx.stroke();

      // Distance value
      const dist = Math.hypot(voiceX - currentX, voiceY - currentY);
      const midX = (currentX + voiceX) / 2;
      const midY = (currentY + voiceY) / 2;
      
      ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dist.toFixed(0), midX, midY);
    }
  }, [isOpen, elapsedSeconds, enrolledVoiceCount, currentVoiceName]);

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
            Speaker embedding space and synthesis metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Embedding Space Visualization */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Speaker Embedding Space</h3>
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full border border-border rounded-lg bg-slate-900"
            />
            <p className="text-xs text-muted-foreground">
              Green circle shows current voice position. Lines show distance to enrolled voices.
            </p>
          </div>

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
