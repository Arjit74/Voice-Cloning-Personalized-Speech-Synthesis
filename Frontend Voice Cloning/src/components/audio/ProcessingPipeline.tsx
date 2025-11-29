import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  progress?: number;
  duration?: number; // in seconds
  startTime?: number; // timestamp when stage started
}

interface ProcessingPipelineProps {
  isActive: boolean;
  currentStage?: string;
  synthesizerStartTime?: number | null; // timestamp from parent when synthesis started
  className?: string;
}

export default function ProcessingPipeline({
  isActive,
  currentStage,
  synthesizerStartTime,
  className = ""
}: ProcessingPipelineProps) {
  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: 'encoder',
      name: 'Speaker Encoder',
      description: 'Extracting voice embedding',
      status: 'pending',
      progress: 0,
      duration: 3
    },
    {
      id: 'synthesizer',
      name: 'Tacotron2 Synthesizer',
      description: 'Generating mel-spectrogram',
      status: 'pending',
      progress: 0,
      duration: 45
    },
    {
      id: 'vocoder',
      name: 'WaveRNN Vocoder',
      description: 'Converting to audio',
      status: 'pending',
      progress: 0,
      duration: 10
    }
  ]);

  // Real-time sync with backend using elapsed time
  useEffect(() => {
    if (!isActive || !synthesizerStartTime) {
      // Reset stages when not active
      setStages(s => s.map(st => ({ ...st, status: 'pending', progress: 0 })));
      return;
    }

    // Update progress based on actual elapsed time from backend
    const updateProgress = () => {
      const elapsedMs = Date.now() - synthesizerStartTime;
      const elapsedSeconds = elapsedMs / 1000;

      setStages(prevStages => {
        return prevStages.map(stage => {
          // Define stage timing
          let stageStart = 0;
          let stageDuration = stage.duration || 0;

          if (stage.id === 'encoder') {
            stageStart = 0;
            stageDuration = 3;
          } else if (stage.id === 'synthesizer') {
            stageStart = 3;
            stageDuration = 45;
          } else if (stage.id === 'vocoder') {
            stageStart = 48;
            stageDuration = 10;
          }

          const stageEnd = stageStart + stageDuration;

          // Calculate status based on actual elapsed time
          if (elapsedSeconds < stageStart) {
            // Stage hasn't started yet
            return { ...stage, status: 'pending', progress: 0 };
          } else if (elapsedSeconds >= stageStart && elapsedSeconds < stageEnd) {
            // Stage is currently active
            const stageElapsed = elapsedSeconds - stageStart;
            const progress = Math.min(99, (stageElapsed / stageDuration) * 100);
            return { ...stage, status: 'active', progress };
          } else {
            // Stage is completed
            return { ...stage, status: 'completed', progress: 100 };
          }
        });
      });
    };

    // Update immediately
    updateProgress();

    // Update every 100ms for smooth animation
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [isActive, synthesizerStartTime]);

  const getStageIcon = (stage: PipelineStage) => {
    if (stage.status === 'completed') {
      return <CheckCircle2 className="w-6 h-6 text-green-400" />;
    } else if (stage.status === 'active') {
      return <Loader className="w-6 h-6 text-blue-400 animate-spin" />;
    } else {
      return <Circle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Processing Pipeline
        </h3>
        {isActive && (
          <span className="text-xs text-blue-400 animate-pulse">
            Synthesizing...
          </span>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.id} className="space-y-1.5">
            {/* Stage Header */}
            <div className="flex items-center gap-3">
              {getStageIcon(stage)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {stage.name}
                  </p>
                  {stage.progress !== undefined && stage.status !== 'pending' && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(stage.progress)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="ml-9 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(stage.status)} transition-all duration-300 ${
                  stage.progress === 100 ? 'w-full' : ''
                }`}
                data-progress={Math.round(stage.progress || 0)}
              />
            </div>

            {/* Connector Line */}
            {index < stages.length - 1 && (
              <div className="ml-3 h-2 border-l-2 border-gray-600" />
            )}
          </div>
        ))}
      </div>

      {/* Timeline Info */}
      <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span>Speaker Encoder: Loads your voice</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span>Tacotron2: Generates speech pattern</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span>Vocoder: Creates audio waveform</span>
          </p>
        </div>
      </div>
    </div>
  );
}
