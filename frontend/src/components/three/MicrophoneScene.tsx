import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Box, Float, Text3D, OrbitControls, MeshDistortMaterial, Ring } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

interface MicrophoneProps {
  isRecording: boolean;
  position?: [number, number, number];
}

function Microphone({ isRecording, position = [0, 0, 0] }: MicrophoneProps) {
  const meshRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    
    if (sphereRef.current && isRecording) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      sphereRef.current.scale.setScalar(scale);
    }

    // Animate recording rings
    ringRefs.current.forEach((ring, index) => {
      if (ring && isRecording) {
        const time = state.clock.elapsedTime;
        const delay = index * 0.3;
        const scale = 1 + Math.sin(time * 2 + delay) * 0.5;
        const opacity = Math.max(0, Math.sin(time * 1.5 + delay));
        ring.scale.setScalar(scale);
        (ring.material as THREE.MeshBasicMaterial).opacity = opacity * 0.3;
      }
    });
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={meshRef} position={position}>
        {/* Microphone body with enhanced materials */}
        <Box args={[0.3, 1.5, 0.3]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={isRecording ? "#a855f7" : "#6366f1"} 
            metalness={0.9}
            roughness={0.1}
            emissive={isRecording ? "#8b5cf6" : "#000000"}
            emissiveIntensity={isRecording ? 0.2 : 0}
          />
        </Box>
        
        {/* Enhanced microphone head with distortion effect */}
        <Sphere ref={sphereRef} args={[0.4]} position={[0, 1, 0]}>
          <MeshDistortMaterial 
            color={isRecording ? "#ec4899" : "#8b5cf6"} 
            metalness={0.9}
            roughness={0.1}
            emissive={isRecording ? "#ec4899" : "#000000"}
            emissiveIntensity={isRecording ? 0.5 : 0}
            distort={isRecording ? 0.3 : 0.1}
            speed={isRecording ? 3 : 1}
          />
        </Sphere>
        
        {/* Enhanced base with glow */}
        <Box args={[0.8, 0.2, 0.8]} position={[0, -1, 0]}>
          <meshStandardMaterial 
            color="#374151" 
            metalness={0.8} 
            roughness={0.2}
            emissive="#4f46e5"
            emissiveIntensity={0.1}
          />
        </Box>

        {/* Multiple recording indicator rings with different sizes */}
        {isRecording && [0.8, 1.2, 1.6, 2.0].map((size, index) => (
          <Ring 
            key={index}
            ref={(el) => (ringRefs.current[index] = el)}
            args={[size, size + 0.1, 32]} 
            position={[0, 1, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshBasicMaterial 
              color={index % 2 === 0 ? "#ec4899" : "#a855f7"} 
              transparent 
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </Ring>
        ))}

        {/* Floating energy particles around microphone when recording */}
        {isRecording && Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 2;
          return (
            <Float key={i} speed={3} rotationIntensity={1} floatIntensity={2}>
              <Sphere 
                args={[0.05]} 
                position={[
                  Math.cos(angle) * radius, 
                  1 + Math.sin(i) * 0.5, 
                  Math.sin(angle) * radius
                ]}
                >
                  <meshStandardMaterial 
                    color="#fbbf24" 
                    emissive="#f59e0b"
                    emissiveIntensity={0.8}
                    metalness={0.1}
                    roughness={0.3}
                  />
                </Sphere>
            </Float>
          );
        })}
      </group>
    </Float>
  );
}

interface MicrophoneSceneProps {
  isRecording?: boolean;
  className?: string;
}

export default function MicrophoneScene({ isRecording = false, className = "" }: MicrophoneSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
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
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a855f7" />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#06b6d4" />
          
          <Microphone isRecording={isRecording} />
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
          />

          {/* Enhanced post-processing effects */}
          {isRecording && (
            <EffectComposer>
              <Bloom 
                intensity={1.5}
                luminanceThreshold={0.2} 
                luminanceSmoothing={0.9} 
              />
              <ChromaticAberration offset={[0.002, 0.002]} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}