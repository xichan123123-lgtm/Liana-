
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import MagicParticles from './MagicParticles';
import TreeTopper from './TreeTopper';
import SpiralEffect from './SpiralEffect';
import { AppState } from '../types';

interface SceneProps {
  appState: AppState;
}

// Wrapper to rotate the whole group slowly
const RotatingGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1; // Slow rotation
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

// Background Environment with slow parallax/rotation effect
const BackgroundEnvironment = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slowly rotate the stars to create a feeling of a turning universe
      // Different speed/axis than the tree for parallax feel
      groupRef.current.rotation.y -= delta * 0.02; 
      // Subtle wobbling on X
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
       <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
};

// A light that orbits the scene to create dynamic specular reflections on metallic objects
const MovingLight = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime * 0.5;
      // Orbit around center
      lightRef.current.position.x = Math.sin(t) * 12;
      lightRef.current.position.z = Math.cos(t) * 12;
      // Bob up and down slightly
      lightRef.current.position.y = Math.sin(t * 1.5) * 3 + 6; 
    }
  });
  return <pointLight ref={lightRef} intensity={3} distance={25} decay={2} color="#fffebb" />;
};

const Scene: React.FC<SceneProps> = ({ appState }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 45 }}
      dpr={[1, 2]} // Support high DPI
      gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
    >
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 15, 35]} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffaa00" />
      <spotLight 
        position={[-10, 20, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        color="#ffeb3b"
      />
      
      {/* Dynamic light for glitter effect */}
      <MovingLight />

      {/* Slowly Rotating Background Stars */}
      <BackgroundEnvironment />

      {/* Main Content */}
      <RotatingGroup>
        <MagicParticles appState={appState} />
        <TreeTopper appState={appState} />
        <SpiralEffect appState={appState} />
      </RotatingGroup>

      {/* Magical Sparkles (Foreground/Midground atmosphere) */}
      <Sparkles 
        count={200} 
        scale={12} 
        size={4} 
        speed={0.4} 
        opacity={0.5} 
        color="#FFD700" // Gold dust
      />
      <Sparkles 
        count={150} 
        scale={15} 
        size={2} 
        speed={0.8} 
        opacity={0.8} 
        color="#FFFFFF" // White glitter
      />

      {/* Environment & Effects */}
      <ContactShadows resolution={1024} scale={30} blur={2} opacity={0.5} far={10} color="#000000" />
      <Environment preset="city" />
      
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.8} 
          radius={0.4}
        />
      </EffectComposer>

      <OrbitControls 
        enablePan={false} 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 1.5}
        minDistance={5}
        maxDistance={30}
        makeDefault 
      />
    </Canvas>
  );
};

export default Scene;
