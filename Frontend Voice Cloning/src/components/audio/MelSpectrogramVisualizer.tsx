import { useEffect, useRef, useState } from 'react';

interface MelSpectrogramVisualizerProps {
  isActive: boolean;
  spectrogramData?: number[][];
  audioFilename?: string;
  className?: string;
}

export default function MelSpectrogramVisualizer({ 
  isActive, 
  spectrogramData,
  audioFilename,
  className = "" 
}: MelSpectrogramVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [melData, setMelData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real mel-spectrogram data from backend periodically
  useEffect(() => {
    if (!isActive || !audioFilename) return;

    const fetchMelData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/spectrogram/${audioFilename}`
        );
        if (response.ok) {
          const result = await response.json();
          setMelData(result.spectrogram || []);
        }
      } catch (err) {
        // Silently fail - backend may not have file yet
      }
    };

    // Fetch immediately and then poll every 3 seconds during synthesis
    fetchMelData();
    const interval = setInterval(fetchMelData, 3000);

    return () => clearInterval(interval);
  }, [isActive, audioFilename]);

  // Draw mel-spectrogram on canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, width, height);

      if (melData.length > 0) {
        drawRealSpectrogram(ctx, width, height, melData);
      } else if (isActive) {
        drawLoadingPlaceholder(ctx, width, height);
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    if (isActive) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, melData]);

  const drawRealSpectrogram = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: number[][]
  ) => {
    if (data.length === 0) return;

    const timeSteps = data.length;
    const freqBins = data[0]?.length || 80;
    const pixelsPerTime = Math.max(1, width / timeSteps);
    const pixelsPerFreq = height / freqBins;

    // Draw each time-frequency bin with correct orientation
    // Time flows left-to-right, frequency flows bottom-to-top
    for (let t = 0; t < timeSteps; t++) {
      for (let f = 0; f < freqBins; f++) {
        const value = data[t]?.[f] ?? 0;
        // Normalize to 0-1 range (backend returns 0-255)
        const normalizedValue = Math.min(1, Math.max(0, value / 255));

        const color = getSpectrogramColor(normalizedValue);
        ctx.fillStyle = color;

        // Draw pixel at time t, frequency f
        // Frequency 0 at bottom, increasing upward
        const xPos = t * pixelsPerTime;
        const yPos = height - (f + 1) * pixelsPerFreq;

        ctx.fillRect(
          xPos,
          yPos,
          Math.ceil(pixelsPerTime),
          Math.ceil(pixelsPerFreq)
        );
      }
    }

    // Add horizontal frequency guide lines (optional)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    const numGuides = 4;
    for (let i = 1; i < numGuides; i++) {
      const y = height - (i / numGuides) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawLoadingPlaceholder = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const time = Date.now() / 1000;
    const freqBins = 80;
    const binHeight = height / freqBins;

    // Animated pattern while waiting for real data
    for (let f = 0; f < freqBins; f++) {
      const intensity = 
        Math.sin(f / 10 + time * 2) * 0.3 + 
        Math.sin(time * 4) * 0.2 + 0.3;

      const color = getSpectrogramColor(Math.min(1, intensity));
      ctx.fillStyle = color;
      ctx.fillRect(0, f * binHeight, width, binHeight + 1);
    }

    // Scanning line effect
    const scanX = (time * 100) % width;
    ctx.strokeStyle = 'rgba(100, 255, 100, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scanX, 0);
    ctx.lineTo(scanX, height);
    ctx.stroke();
  };

  const getSpectrogramColor = (intensity: number): string => {
    // Viridis-like colormap optimized for mel-spectrograms
    // Matches reference images: dark purple/blue → cyan → green → yellow → bright white
    
    if (intensity < 0.1) {
      // Almost black to dark purple
      const t = intensity / 0.1;
      const r = Math.floor(10 + t * 40);
      const g = Math.floor(5 + t * 20);
      const b = Math.floor(30 + t * 80);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.2) {
      // Dark purple to deep blue
      const t = (intensity - 0.1) / 0.1;
      const r = Math.floor(50 + t * 10);
      const g = Math.floor(25 - t * 10);
      const b = Math.floor(110 + t * 80);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.3) {
      // Deep blue to cyan
      const t = (intensity - 0.2) / 0.1;
      const r = Math.floor(60 - t * 30);
      const g = Math.floor(15 + t * 180);
      const b = Math.floor(190 + t * 65);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.4) {
      // Cyan to bright green
      const t = (intensity - 0.3) / 0.1;
      const r = Math.floor(30 - t * 30);
      const g = Math.floor(195 + t * 60);
      const b = Math.floor(255 - t * 255);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.55) {
      // Bright green to yellow-green
      const t = (intensity - 0.4) / 0.15;
      const r = Math.floor(0 + t * 200);
      const g = Math.floor(255 - t * 50);
      const b = Math.floor(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.7) {
      // Yellow-green to bright yellow
      const t = (intensity - 0.55) / 0.15;
      const r = Math.floor(200 + t * 55);
      const g = Math.floor(205 + t * 50);
      const b = Math.floor(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.85) {
      // Bright yellow to orange-red
      const t = (intensity - 0.7) / 0.15;
      const r = Math.floor(255);
      const g = Math.floor(255 - t * 100);
      const b = Math.floor(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Orange-red to bright white (peaks)
      const t = (intensity - 0.85) / 0.15;
      const r = Math.floor(255);
      const g = Math.floor(155 + t * 100);
      const b = Math.floor(0 + t * 255);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };


  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Real-Time Mel-Spectrogram
        </label>
        {isActive && (
          <span className="text-xs text-cyan-400 animate-pulse">
            ● Live Feed
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={140}
        className={`w-full rounded-lg border transition-all ${
          isActive 
            ? 'border-cyan-400/50 shadow-lg shadow-cyan-400/20' 
            : 'border-border'
        }`}
        style={{ backgroundColor: '#0a0a0a' }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Time (→)</span>
        <span className="text-center">Frequency (↑)</span>
        <span>Energy (intensity)</span>
      </div>
    </div>
  );
}
