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
  const [animatedFftData, setAnimatedFftData] = useState<number[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const BINS = 32;

  // Fetch and analyze real audio data from backend - SIMPLE
  useEffect(() => {
    if (!isActive || !audioFilename) {
      setFftData([]);
      setAnimatedFftData([]);
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
        const samplesPerBin = Math.floor(channelData.length / BINS);
        const result: number[] = [];

        for (let i = 0; i < BINS; i++) {
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
        lastUpdateRef.current = Date.now();
      } catch (err) {
        console.error('[FFT] Error:', err);
      }
    };

    fetchAndAnalyzeAudio();
    const interval = setInterval(fetchAndAnalyzeAudio, 3000);
    return () => clearInterval(interval);
  }, [isActive, audioFilename]);

  // Smooth animation between FFT updates
  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      const nowSec = synthesizerStartTime
        ? (Date.now() - synthesizerStartTime) / 1000
        : Date.now() / 1000;

      setAnimatedFftData(prev => {
        // If no real FFT data yet, produce a synchronized placeholder animation
        if (fftData.length === 0) {
          const placeholder = new Array(BINS).fill(0).map((_, i) => {
            const phase = i * 0.35;
            const val = (Math.sin(nowSec * 2 + phase) + 1) / 2; // 0..1
            const env = (Math.sin(nowSec * 0.7 + i * 0.13) + 1) / 2;
            return Math.min(255, Math.max(0, (val * 0.6 + env * 0.4) * 255 + (Math.random() - 0.5) * 8));
          });
          return placeholder;
        }

        // If we have real data, smoothly animate current bars toward targets
        if (prev.length === 0) return fftData;

        const animationSpeed = 0.15; // adjust for faster/slower animation
        return prev.map((current, i) => {
          const target = fftData[i] || 0;
          const diff = target - current;
          return current + diff * animationSpeed;
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, fftData]);

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

    if (animatedFftData.length > 0) {
      // Draw bars with animation
      const barWidth = width / animatedFftData.length;
      for (let i = 0; i < animatedFftData.length; i++) {
        const magnitude = Math.min(animatedFftData[i], 255);
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

  }, [animatedFftData, isActive]);

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

