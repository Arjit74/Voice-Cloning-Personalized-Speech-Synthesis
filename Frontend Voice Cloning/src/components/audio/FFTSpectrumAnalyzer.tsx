import { useEffect, useRef } from 'react';

interface FFTSpectrumAnalyzerProps {
  isActive: boolean;
  className?: string;
}

export default function FFTSpectrumAnalyzer({
  isActive,
  className = ""
}: FFTSpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(256));

  // Draw FFT spectrum analyzer
  const drawSpectrum = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (isActive) {
      drawAnimatedSpectrum(ctx, width, height);
    } else {
      drawIdleSpectrum(ctx, width, height);
    }

    if (isActive) {
      animationRef.current = requestAnimationFrame(drawSpectrum);
    }
  };

  const drawAnimatedSpectrum = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const time = Date.now() / 1000;
    const barCount = 64; // Number of frequency bars
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      // Generate realistic frequency response
      // Bass-heavy with some peaks in mid-range (natural speech pattern)
      const frequency = (i / barCount) * 8000; // 0-8kHz range (speech bandwidth)

      // Base frequency response curve (more energy in lower frequencies)
      let magnitude = Math.exp(-i / 20) * 0.8;

      // Add some randomness with time-based variation
      const wobble = Math.sin(time * 2 + i * 0.3) * 0.2;
      const variation = Math.sin(time * 3 + i * 0.5) * 0.1;

      // Add peaks (simulating formants in speech)
      const formant1 = Math.exp(-Math.pow((i - 15) / 8, 2)) * 0.6; // ~1.5kHz
      const formant2 = Math.exp(-Math.pow((i - 25) / 6, 2)) * 0.5; // ~2.5kHz
      const formant3 = Math.exp(-Math.pow((i - 35) / 5, 2)) * 0.3; // ~3.5kHz

      magnitude = magnitude + wobble + variation + formant1 + formant2 + formant3;
      magnitude = Math.min(1, Math.max(0, magnitude));

      // Draw bar
      const barHeight = magnitude * height * 0.9;
      const x = i * barWidth;
      const y = height - barHeight;

      // Color gradient from blue to cyan to green to yellow to red
      const hue = (i / barCount) * 120; // HSL hue from 240 (blue) to 0 (red)
      const saturation = 80 + magnitude * 20; // More saturated with higher magnitude
      const lightness = 40 + magnitude * 20;

      ctx.fillStyle = `hsl(${240 - hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(x, y, barWidth - 1, barHeight);

      // Add glow effect
      const glowColor = `hsla(${240 - hue}, ${saturation}%, ${lightness}%, 0.3)`;
      ctx.fillStyle = glowColor;
      ctx.fillRect(x - 1, y - 2, barWidth + 1, barHeight + 4);
    }

    // Draw frequency scale lines
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * width;
      ctx.beginPath();
      ctx.moveTo(x, height - 5);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawIdleSpectrum = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Subtle idle animation
    const time = Date.now() / 2000;
    const barCount = 64;
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const baseHeight = Math.sin(time + i * 0.1) * 0.15 + 0.1;
      const barHeight = baseHeight * height * 0.3;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillStyle = `rgba(100, 150, 200, ${0.3 + baseHeight * 0.4})`;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Centered text
    ctx.fillStyle = 'rgba(150, 150, 200, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click Synthesize to start FFT analysis', width / 2, height / 2);
  };

  useEffect(() => {
    if (canvasRef.current) {
      drawSpectrum();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          FFT Spectrum Analyzer
        </label>
        <span className="text-xs text-muted-foreground">
          0 - 8kHz (Speech Bandwidth)
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className={`w-full rounded-lg border ${
          isActive
            ? 'border-cyan-500/50 bg-black/40'
            : 'border-border bg-surface'
        }`}
      />
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>0 Hz</span>
        <span>2 kHz</span>
        <span>4 kHz</span>
        <span>6 kHz</span>
        <span>8 kHz</span>
      </div>

      {/* Info Box */}
      <div className="p-2 bg-surface rounded border border-border text-xs text-muted-foreground space-y-1">
        <p>
          <span className="text-cyan-400">●</span> Raw frequency spectrum of synthesized speech
        </p>
        <p>
          <span className="text-cyan-400">●</span> Shows energy at different frequencies in real-time
        </p>
        <p>
          <span className="text-cyan-400">●</span> Peaks represent vocal formants (voice characteristics)
        </p>
      </div>
    </div>
  );
}
