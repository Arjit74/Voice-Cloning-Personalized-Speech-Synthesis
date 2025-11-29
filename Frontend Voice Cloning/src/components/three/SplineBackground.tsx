import { Suspense, useEffect, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';

interface SplineBackgroundProps {
  scene?: string;
  className?: string;
  onLoad?: () => void;
}

// Fallback component for loading state
function SplineFallback({ message = 'Loading 3D Scene...' }: { message?: string }) {
  return (
    <div className="w-full h-full bg-gradient-surface flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="w-32 h-32 bg-primary/20 rounded-full mx-auto animate-float"></div>
        <div className="text-center text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}

export default function SplineBackground({ 
  scene = "https://prod.spline.design/6Wq8T6XmHxrGMwni/scene.splinecode", 
  className = "",
  onLoad 
}: SplineBackgroundProps) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSplineCode = scene.trim().toLowerCase().endsWith('.splinecode');

  // Preflight check: ensure the scene URL is reachable before trying to load Spline
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setReady(false);
    (async () => {
      try {
        // Use no-cors GET: many CDNs block HEAD and CORS; opaque means we cannot inspect but still OK to try
        const res = await fetch(scene, { method: 'GET', mode: 'no-cors' });
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error('Spline scene pre-check failed', e);
        if (!cancelled) setError('Failed to reach 3D scene');
      }
    })();
    return () => { cancelled = true; };
  }, [scene]);

  // Handle WebGL context loss gracefully
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onContextLost = (ev: Event) => {
      console.warn('WebGL context lost');
      setError('Graphics context lost');
      ev.preventDefault();
    };
    const onContextRestored = () => {
      console.info('WebGL context restored');
      setError(null);
    };

    el.addEventListener('webglcontextlost', onContextLost as EventListener, false);
    el.addEventListener('webglcontextrestored', onContextRestored as EventListener, false);

    return () => {
      el.removeEventListener('webglcontextlost', onContextLost as EventListener, false);
      el.removeEventListener('webglcontextrestored', onContextRestored as EventListener, false);
    };
  }, []);

  if (error) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <SplineFallback message={error} />
      </div>
    );
  }

  // If the provided URL is not a .splinecode, use an iframe fallback. This supports community/share links.
  if (!isSplineCode) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        {ready ? (
          <iframe
            src={scene}
            title="Spline Scene"
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
            allow="xr-spatial-tracking; clipboard-read; clipboard-write; accelerometer; magnetometer; gyroscope; autoplay"
          />
        ) : (
          <SplineFallback />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <Suspense fallback={<SplineFallback />}>
        {ready ? (
          <Spline
            scene={scene}
            onLoad={onLoad}
            // If the version supports it, onError will be called; otherwise pre-check and boundary handle it.
            // @ts-expect-error - onError may not exist on older versions
            onError={(e: unknown) => {
              console.error('Spline load error', e);
              setError('Failed to load 3D scene');
            }}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          />
        ) : (
          <SplineFallback />
        )}
      </Suspense>
    </div>
  );
}

// Alternative Spline scenes for different purposes
export const SplineScenes = {
  // Abstract floating elements
  abstract: "https://prod.spline.design/6Wq8T6XmHxrGMwni/scene.splinecode",
  
  // Microphone visualization 
  microphone: "https://prod.spline.design/kR3K8EqaAlKZXBPv/scene.splinecode",
  
  // Speaker/audio visualization
  speaker: "https://prod.spline.design/m8rFoLJGtKVQZuE5/scene.splinecode",
  
  // Particle system
  particles: "https://prod.spline.design/K7n4XGsOzMqBgEF1/scene.splinecode"
};