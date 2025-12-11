
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';

const SpiralEffect = ({ appState }: { appState: AppState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 500; // Increased count for "magic dust" feel

  // Generate random properties for each particle
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        // Start randomly along the height
        yPhase: Math.random() * 14, 
        // Speed of ascent (slower for floating feel)
        speed: 0.2 + Math.random() * 0.4,
        // Radius offset to make it a thick band
        radiusOffset: Math.random() * 1.0,
        // Starting angle
        anglePhase: Math.random() * Math.PI * 2,
        // Rotation speed specific to particle (varied for natural look)
        rotSpeed: 0.5 + Math.random() * 0.5,
        // Base scale (Very small for magic particle look)
        scale: 0.01 + Math.random() * 0.025
      });
    }
    return temp;
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const isTree = appState === AppState.TREE;
    
    let i = 0;
    for (const p of particles) {
      // Calculate Y position: Loop from -7 to 7
      // We want particles to rise up.
      const loopH = (p.yPhase + time * p.speed) % 14; 
      let y = loopH - 7; 

      // Dimensions based on Tree
      // Tree is roughly y=6 (top) to y=-6 (bottom)
      
      // Calculate geometric radius at this height to conform to cone
      const hClamped = Math.max(-6, Math.min(6, y));
      // Normalized: 1.0 at bottom (-6), 0.0 at top (6)
      const heightFactor = (6 - hClamped) / 12; 
      
      const baseRadius = heightFactor * 6.5; // Slightly wider than tree
      const r = baseRadius + 0.5 + p.radiusOffset; 

      // Spiral motion (Rotating around)
      const angle = p.anglePhase + time * p.rotSpeed; 

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      dummy.position.set(x, y, z);
      
      // Scale Logic
      let s = p.scale;
      
      // Fade out at top and bottom edges smoothly
      if (y > 4) s *= Math.max(0, (7 - y) / 3); 
      if (y < -5) s *= Math.max(0, (y + 7) / 2);

      // Hide if not tree state
      if (!isTree) {
         s = 0;
      } else {
         // Twinkle effect (Magic sparkle)
         // Fast flicker
         s *= (0.6 + 0.4 * Math.sin(time * 10 + i * 132));
      }

      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      i++;
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} /> {/* Low poly sphere is fine for dots */}
      <meshBasicMaterial 
        color="#FFFFFF" // White magic particles
        transparent 
        opacity={0.9} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
        toneMapped={false} // Make them bright/glowing
      />
    </instancedMesh>
  );
};

export default SpiralEffect;
