import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Box, Torus, Float, Text3D, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

function FloatingShape({ position, shape }: { position: [number, number, number], shape: 'sphere' | 'box' | 'torus' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime + position[0]) * 0.2;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime + position[1]) * 0.3;
    }
  });

  const renderShape = () => {
    switch (shape) {
      case 'sphere':
        return (
          <Sphere ref={meshRef} args={[0.5]} position={position}>
            <MeshDistortMaterial
              color="#a855f7"
              transparent
              opacity={0.8}
              distort={0.3}
              speed={2}
              emissive="#8b5cf6"
              emissiveIntensity={0.3}
            />
          </Sphere>
        );
      case 'box':
        return (
          <Box ref={meshRef} args={[0.8, 0.8, 0.8]} position={position}>
            <MeshDistortMaterial
              color="#06b6d4"
              transparent
              opacity={0.7}
              distort={0.2}
              speed={1.5}
              emissive="#0891b2"
              emissiveIntensity={0.4}
            />
          </Box>
        );
      case 'torus':
        return (
          <Torus ref={meshRef} args={[0.5, 0.2, 16, 32]} position={position}>
            <MeshDistortMaterial
              color="#ec4899"
              transparent
              opacity={0.6}
              distort={0.4}
              speed={3}
              emissive="#db2777"
              emissiveIntensity={0.5}
            />
          </Torus>
        );
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      {renderShape()}
    </Float>
  );
}

function WaveformBars() {
  const groupRef = useRef<THREE.Group>(null);
  const barsCount = 20;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((bar, index) => {
        const height = 1 + Math.sin(state.clock.elapsedTime * 3 + index * 0.3) * 0.5;
        bar.scale.y = height;
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {Array.from({ length: barsCount }, (_, i) => (
        <Box key={i} args={[0.1, 1, 0.1]} position={[(i - barsCount / 2) * 0.2, 0, 0]}>
          <meshStandardMaterial
            color="#a855f7"
            emissive="#8b5cf6"
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </Box>
      ))}
    </group>
  );
}

interface FloatingElementsProps {
  className?: string;
  showEffects?: boolean;
}

export default function FloatingElements({ className = "", showEffects = true }: FloatingElementsProps) {
  const shapes: Array<{ position: [number, number, number], shape: 'sphere' | 'box' | 'torus' }> = [
    { position: [-3, 2, -2], shape: 'sphere' },
    { position: [3, -1, -3], shape: 'box' },
    { position: [-2, -2, -1], shape: 'torus' },
    { position: [2, 3, -2], shape: 'sphere' },
    { position: [-4, 0, -4], shape: 'box' },
    { position: [4, -3, -1], shape: 'torus' },
  ];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
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
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#a855f7" />
        
        {shapes.map((item, index) => (
          <FloatingShape key={index} position={item.position} shape={item.shape} />
        ))}
        
        <WaveformBars />

        {showEffects && (
          <EffectComposer>
            <Bloom intensity={0.35} luminanceThreshold={0.25} luminanceSmoothing={0.8} />
            <ChromaticAberration offset={[0.0008, 0.0008]} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}