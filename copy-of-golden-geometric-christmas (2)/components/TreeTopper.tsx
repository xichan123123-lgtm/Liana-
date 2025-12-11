import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';

interface TreeTopperProps {
  appState: AppState;
}

const TreeTopper: React.FC<TreeTopperProps> = ({ appState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Create a 3D Star shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    // Adjusted size for better proportions (moderate size)
    const outerRadius = 0.9; 
    const innerRadius = 0.45;

    for (let i = 0; i < points * 2; i++) {
      // Calculate angle
      // Start at Math.PI / 2 (90 degrees) so the first outer point (i=0) is at the top (North).
      // This creates a "visually upright" star (one point up, two legs down).
      const angle = (i * Math.PI) / points + Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.1,
      bevelSegments: 3
    });
    
    // Only center on Z axis to ensure rotation happens around the star's geometric center (0,0)
    // Using geometry.center() would shift Y due to the asymmetry of the star shape (top point vs bottom legs)
    // causing a wobbling effect.
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
       const zCenter = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;
       geometry.translate(0, 0, -zCenter);
    }
    
    return geometry;
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !lightRef.current) return;
    
    const time = state.clock.elapsedTime;

    // Rotate constantly around Y axis (vertical axis) for symmetry
    meshRef.current.rotation.y = time * 0.5;
    // Ensure upright orientation
    meshRef.current.rotation.z = 0; 
    meshRef.current.rotation.x = 0;

    // Scale logic: Only show in TREE state
    const targetScale = appState === AppState.TREE ? 1 : 0;
    const currentScale = meshRef.current.scale.x;
    const lerpScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    
    meshRef.current.scale.setScalar(lerpScale);

    // Twinkle effect (sine wave)
    const twinkle = Math.sin(time * 3) * 0.3 + 0.1;

    // Light intensity: Base 2 + twinkle
    const targetLightIntensity = appState === AppState.TREE ? 2 + twinkle : 0;
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetLightIntensity, 0.1);

    // Material Emissive Intensity: Base 0.6 + scaled twinkle
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    if (material) {
      const targetEmissive = appState === AppState.TREE ? 0.6 + (twinkle * 0.5) : 0;
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetEmissive, 0.1);
    }
  });

  return (
    <group position={[0, 6.2, 0]}> {/* Adjusted height to sit perfectly on top */}
      <mesh ref={meshRef} geometry={starGeometry}>
        <meshStandardMaterial 
          color="#FFD700" 
          emissive="#FFD700"
          emissiveIntensity={0.6}
          metalness={1.0}
          roughness={0.2}
        />
      </mesh>
      <pointLight ref={lightRef} color="#FFD700" distance={8} decay={2} />
    </group>
  );
};

export default TreeTopper;