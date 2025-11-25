import { useEffect, useRef, useState } from 'react';

interface FFTVisualizerProps {
  isActive: boolean;
  audioFilename?: string;
  synthesizerStartTime?: number | null;
  className?: string;
}

export default function FFTVisualizer({
  isActive,
  audioFilename,
  synthesizerStartTime,
  className = ""
}: FFTVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [fftData, setFftData] = useState<number[]>([]);

  // Fetch and analyze real audio data from backend - SIMPLE
  useEffect(() => {
    if (!isActive || !audioFilename) {
      setFftData([]);
      return;
    }

    const fetchAndAnalyzeAudio = async () => {
      try {
        console.log('[FFT] Fetching:', audioFilename);
        
        const response = await fetch(
          `http://localhost:5000/api/audio/${audioFilename}`
        );
        
        if (!response.ok) {
          console.error('[FFT] Failed:', response.status);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('[FFT] Got audio, size:', arrayBuffer.byteLength);
        
        // Decode audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        
        console.log('[FFT] Decoded, samples:', channelData.length);

        // SUPER SIMPLE: 32 bins, just max amplitude per bin
        const bins = 32;
        const samplesPerBin = Math.floor(channelData.length / bins);
        const result: number[] = [];

        for (let i = 0; i < bins; i++) {
          const start = i * samplesPerBin;
          const end = Math.min(start + samplesPerBin, channelData.length);
          
          let maxAmp = 0;
          for (let j = start; j < end; j++) {
            maxAmp = Math.max(maxAmp, Math.abs(channelData[j]));
          }
          
          result.push(maxAmp * 255);
        }

        console.log('[FFT] Result:', result);
        setFftData(result);
      } catch (err) {
        console.error('[FFT] Error:', err);
      }
    };

    fetchAndAnalyzeAudio();
    const interval = setInterval(fetchAndAnalyzeAudio, 3000);
    return () => clearInterval(interval);
  }, [isActive, audioFilename]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    if (fftData.length > 0) {
      // Draw bars
      const barWidth = width / fftData.length;
      for (let i = 0; i < fftData.length; i++) {
        const magnitude = Math.min(fftData[i], 255);
        const barHeight = (magnitude / 255) * (height - 20);
        const x = i * barWidth;
        const y = height - barHeight - 10;

        // Simple green color
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }
    } else if (isActive) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.7)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', width / 2, height / 2);
    }

  }, [fftData, isActive]);

  return (
    <div className={`flex flex-col gap-2 p-4 bg-slate-950 rounded-lg border border-slate-700 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase">
          Frequency Spectrum
        </h3>
        <span className={isActive ? 'text-green-400 text-xs' : 'text-slate-500 text-xs'}>
          {isActive ? '● Live' : '○ Offline'}
        </span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        className="w-full border border-slate-700 rounded bg-black"
      />
    </div>
  );
}

