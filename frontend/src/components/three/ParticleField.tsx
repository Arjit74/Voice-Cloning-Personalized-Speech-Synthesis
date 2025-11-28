import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  isActive?: boolean;
  colorMode?: 'dark' | 'light';
}

function Particles({ count = 1200, isActive = true, colorMode = 'dark' }: ParticleFieldProps) {
  const meshRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const r = Math.random() * 20 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      const t = Math.random();
      if (colorMode === 'light') {
        // Deeper hues for visibility on light backgrounds (indigo to teal, darker luminance)
        const rC = 0.25 + t * 0.25; // 0.25 - 0.5
        const gC = 0.25 + t * 0.35; // 0.25 - 0.6
        const bC = 0.55 + t * 0.25; // 0.55 - 0.8
        colors[i * 3] = rC;
        colors[i * 3 + 1] = gC;
        colors[i * 3 + 2] = bC;
      } else {
        // Purple to cyan gradient colors for dark mode
        colors[i * 3] = 0.6 + t * 0.4; // R
        colors[i * 3 + 1] = 0.3 + t * 0.7; // G  
        colors[i * 3 + 2] = 0.9; // B
      }
    }
    
    return { positions, colors };
  }, [count, colorMode]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      
      if (isActive) {
        // Pulsing effect
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  return (
    <Points ref={meshRef} positions={particles.positions} colors={particles.colors}>
      <PointMaterial
        transparent
        size={colorMode === 'light' ? 0.03 : 0.02}
        sizeAttenuation
        depthWrite={colorMode === 'light'}
        vertexColors
        blending={colorMode === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </Points>
  );
}

interface ParticleFieldSceneProps {
  isActive?: boolean;
  className?: string;
  colorMode?: 'dark' | 'light';
}

export default function ParticleField({ isActive = false, className = "", colorMode = 'dark' }: ParticleFieldSceneProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1]}
        gl={{
          antialias: false,
          alpha: true,
          stencil: false,
          depth: false,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: true,
          preserveDrawingBuffer: false
        }}
        onCreated={({ gl }) => {
          try {
            gl.setPixelRatio(1);
            gl.domElement.addEventListener('webglcontextlost', (e) => (e as Event).preventDefault(), false);
          } catch {}
        }}
      >
        <Particles isActive={isActive} colorMode={colorMode} />
      </Canvas>
    </div>
  );
}