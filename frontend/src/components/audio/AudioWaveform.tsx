import { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  className?: string;
  bars?: number;
}

export default function AudioWaveform({ 
  isRecording = false, 
  isPlaying = false, 
  className = "",
  bars = 20 
}: AudioWaveformProps) {
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(0.3));

  useEffect(() => {
    if (!isRecording && !isPlaying) {
      setHeights(Array(bars).fill(0.3));
      return;
    }

    const interval = setInterval(() => {
      setHeights(prev => 
        prev.map(() => {
          if (isRecording) {
            return Math.random() * 0.7 + 0.3; // More active during recording
          } else if (isPlaying) {
            return Math.random() * 0.5 + 0.2; // Moderate during playback
          }
          return 0.3;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, isPlaying, bars]);

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {heights.map((height, index) => (
        <div
          key={index}
          className={`waveform-bar rounded-full transition-all duration-100 ${
            isRecording ? 'bg-gradient-to-t from-primary to-primary-glow' :
            isPlaying ? 'bg-gradient-to-t from-accent to-accent-glow' :
            'bg-muted'
          }`}
          style={{
            width: '4px',
            height: `${height * 60}px`,
            animationDelay: `${index * 50}ms`,
            opacity: isRecording || isPlaying ? 1 : 0.5
          }}
        />
      ))}
    </div>
  );
}