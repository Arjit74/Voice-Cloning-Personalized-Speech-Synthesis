import { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

interface OrbProps {
  position?: [number, number, number];
  onInteraction?: (type: 'hover' | 'click') => void;
}

function Orb({ position = [0, 0, 0], onInteraction }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Continuous rotation
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      
      // Scale based on interaction
      const targetScale = clicked ? 1.3 : hovered ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    onInteraction?.('hover');
  };

  const handlePointerOut = () => {
    setHovered(false);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 200);
    onInteraction?.('click');
  };

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <Sphere
        ref={meshRef}
        args={[1]}
        position={position}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <MeshDistortMaterial
          color={clicked ? "#ec4899" : hovered ? "#06b6d4" : "#a855f7"}
          transparent
          opacity={0.8}
          distort={hovered ? 0.6 : 0.3}
          speed={clicked ? 5 : hovered ? 3 : 1}
          emissive={clicked ? "#db2777" : hovered ? "#0891b2" : "#8b5cf6"}
          emissiveIntensity={clicked ? 0.8 : hovered ? 0.5 : 0.2}
        />
      </Sphere>
    </Float>
  );
}

interface InteractiveOrbProps {
  onInteraction?: (type: 'hover' | 'click') => void;
  className?: string;
}

export default function InteractiveOrb({ onInteraction, className = "" }: InteractiveOrbProps) {
  return (
    <div className={`w-full h-full cursor-pointer ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a855f7" />
        
        <Orb onInteraction={onInteraction} />
      </Canvas>
    </div>
  );
}