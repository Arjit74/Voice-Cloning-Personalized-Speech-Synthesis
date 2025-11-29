import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Cylinder, Sphere, Float, OrbitControls, MeshDistortMaterial, Ring, Torus } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

interface SpeakerProps {
  isPlaying: boolean;
  position?: [number, number, number];
}

function Speaker({ isPlaying, position = [0, 0, 0] }: SpeakerProps) {
  const meshRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const waveRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bassWaveRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
    
    if (coneRef.current && isPlaying) {
      const vibration = Math.sin(state.clock.elapsedTime * 8) * 0.1;
      coneRef.current.position.z = vibration;
    }

    // Enhanced sound waves animation
    waveRefs.current.forEach((wave, index) => {
      if (wave && isPlaying) {
        const time = state.clock.elapsedTime;
        const delay = index * 0.3;
        const scale = 1 + Math.sin(time * 4 + delay) * 0.4;
        const opacity = Math.max(0, Math.sin(time * 3 + delay));
        wave.scale.setScalar(scale);
        (wave.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
      }
    });

    // Bass wave animation
    bassWaveRefs.current.forEach((wave, index) => {
      if (wave && isPlaying) {
        const time = state.clock.elapsedTime;
        const delay = index * 0.4;
        const scale = 1 + Math.sin(time * 2 + delay) * 0.6;
        const rotation = time * 0.5 + delay;
        wave.scale.setScalar(scale);
        wave.rotation.z = rotation;
        (wave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.sin(time * 2 + delay)) * 0.3;
      }
    });
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <group ref={meshRef} position={position}>
        {/* Enhanced speaker cabinet */}
        <Cylinder args={[1, 1, 2]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color="#1f2937" 
            metalness={0.5}
            roughness={0.5}
            emissive="#374151"
            emissiveIntensity={0.1}
          />
        </Cylinder>
        
        {/* Enhanced speaker cone with distortion */}
        <Cylinder ref={coneRef} args={[0.6, 0.3, 0.2]} position={[0, 0, 1]}>
          <MeshDistortMaterial 
            color={isPlaying ? "#06b6d4" : "#374151"} 
            metalness={0.2}
            roughness={0.6}
            emissive={isPlaying ? "#0891b2" : "#000000"}
            emissiveIntensity={isPlaying ? 0.4 : 0}
            distort={isPlaying ? 0.2 : 0.05}
            speed={isPlaying ? 2 : 0.5}
          />
        </Cylinder>
        
        {/* Speaker grille with glow */}
        <Cylinder args={[0.8, 0.8, 0.05]} position={[0, 0, 1.1]}>
          <meshStandardMaterial 
            color="#111827" 
            metalness={0.9}
            roughness={0.1}
            emissive={isPlaying ? "#06b6d4" : "#000000"}
            emissiveIntensity={isPlaying ? 0.2 : 0}
          />
        </Cylinder>

        {/* Enhanced sound waves with rings */}
        {isPlaying && [1.5, 2.2, 3.0, 3.8].map((distance, index) => (
          <Ring 
            key={`ring-${index}`}
            ref={(el) => (waveRefs.current[index] = el)}
            args={[distance, distance + 0.2, 32]} 
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
          >
            <meshBasicMaterial 
              color="#06b6d4" 
              transparent 
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </Ring>
        ))}

        {/* Bass visualization with torus rings */}
        {isPlaying && [0.8, 1.4, 2.0].map((size, index) => (
          <Torus 
            key={`bass-${index}`}
            ref={(el) => (bassWaveRefs.current[index] = el)}
            args={[size, 0.1, 16, 32]} 
            position={[0, 0, 0]}
          >
            <meshBasicMaterial 
              color="#ec4899" 
              transparent 
              opacity={0.4}
            />
          </Torus>
        ))}

        {/* Bass port with glow */}
        <Cylinder args={[0.1, 0.1, 0.3]} position={[0, -0.7, 0.9]}>
          <meshStandardMaterial 
            color="#000000"
            emissive={isPlaying ? "#06b6d4" : "#000000"}
            emissiveIntensity={isPlaying ? 0.3 : 0}
          />
        </Cylinder>

        {/* Floating sound particles */}
        {isPlaying && Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 2.5 + Math.sin(i) * 0.5;
          return (
            <Float key={i} speed={4} rotationIntensity={1} floatIntensity={3}>
              <Sphere 
                args={[0.03]} 
                position={[
                  Math.cos(angle) * radius, 
                  Math.sin(i * 0.5) * 1.5, 
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

interface SpeakerSceneProps {
  isPlaying?: boolean;
  className?: string;
}

export default function SpeakerScene({ isPlaying = false, className = "" }: SpeakerSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#06b6d4" />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#ec4899" />
          
          <Speaker isPlaying={isPlaying} />
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.8}
          />

          {/* Enhanced post-processing effects */}
          <EffectComposer>
            <Bloom 
              intensity={isPlaying ? 2.0 : 0.3} 
              luminanceThreshold={0.1} 
              luminanceSmoothing={0.9} 
            />
            <ChromaticAberration offset={[0.001, 0.001]} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}