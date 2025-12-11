
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { AppState } from '../types';
import { 
  TOTAL_PARTICLES, 
  SPHERE_COUNT, 
  COLOR_GOLD, 
  COLOR_RED, 
  COLOR_GREEN, 
  COLOR_DEEP_GREEN,
  FONT_URL
} from '../constants';
import { generateTreePositions, generateExplosionPositions, generateTextPositions } from '../utils/geometryGenerator';

interface MagicParticlesProps {
  appState: AppState;
}

const MagicParticles: React.FC<MagicParticlesProps> = ({ appState }) => {
  // Load Font
  const font = useLoader(FontLoader, FONT_URL);

  // References to InstancedMeshes (Main only)
  const spheresRef = useRef<THREE.InstancedMesh>(null);
  const cubesRef = useRef<THREE.InstancedMesh>(null);
  
  // Data Stores
  const [targetPositions, setTargetPositions] = useState<Float32Array | null>(null);
  const textStateStartTime = useRef<number>(0);
  const isTransitioningToText = useRef<boolean>(false);
  
  // Memoize geometry data
  const { treePos, explodePos, textPos } = useMemo(() => {
    if (!font) return { treePos: new Float32Array(), explodePos: new Float32Array(), textPos: new Float32Array() };
    return {
      treePos: generateTreePositions(TOTAL_PARTICLES),
      explodePos: generateExplosionPositions(TOTAL_PARTICLES),
      textPos: generateTextPositions(font, TOTAL_PARTICLES)
    };
  }, [font]);

  // Colors array
  const colors = useMemo(() => {
    const cSpheres = new Float32Array(SPHERE_COUNT * 3);
    const cCubes = new Float32Array((TOTAL_PARTICLES - SPHERE_COUNT) * 3);
    const color = new THREE.Color();

    // Spheres
    for (let i = 0; i < SPHERE_COUNT; i++) {
      if (Math.random() > 0.3) color.set(COLOR_GOLD);
      else color.set(COLOR_RED);
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      cSpheres[i * 3] = color.r;
      cSpheres[i * 3 + 1] = color.g;
      cSpheres[i * 3 + 2] = color.b;
    }

    // Cubes
    for (let i = 0; i < TOTAL_PARTICLES - SPHERE_COUNT; i++) {
      if (Math.random() > 0.5) color.set(COLOR_GOLD);
      else if (Math.random() > 0.5) color.set(COLOR_GREEN);
      else color.set(COLOR_DEEP_GREEN);
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      cCubes[i * 3] = color.r;
      cCubes[i * 3 + 1] = color.g;
      cCubes[i * 3 + 2] = color.b;
    }
    return { spheres: cSpheres, cubes: cCubes };
  }, []);

  // Update target
  useEffect(() => {
    if (!font) return;
    switch (appState) {
      case AppState.TREE: setTargetPositions(treePos); break;
      case AppState.EXPLODED: setTargetPositions(explodePos); break;
      case AppState.TEXT: 
        setTargetPositions(textPos); 
        isTransitioningToText.current = true;
        break;
    }
  }, [appState, font, treePos, explodePos, textPos]);

  // Position Arrays (Current)
  const currentPositions = useRef<Float32Array>(new Float32Array(TOTAL_PARTICLES * 3));
  
  // Initialize positions
  useEffect(() => {
    if (treePos.length > 0 && currentPositions.current[0] === 0) {
       currentPositions.current.set(treePos);
    }
  }, [treePos]);

  // Scale management for smooth transitions
  const currentScales = useRef({ sphere: 0.25, cube: 0.22 });

  // Animation Loop
  useFrame((state, delta) => {
    if (!spheresRef.current || !cubesRef.current || !targetPositions) return;

    // Handle text transition timing
    if (appState === AppState.TEXT && isTransitioningToText.current) {
        textStateStartTime.current = state.clock.elapsedTime;
        isTransitioningToText.current = false;
    }

    const dummy = new THREE.Object3D();
    const lerpSpeed = 4 * delta; 
    const time = state.clock.elapsedTime;

    // Smoothly transition scales based on state
    // When in TEXT state, reduce scale significantly to prevent overlap and improve legibility
    const isTextState = appState === AppState.TEXT;
    
    // Very small particles for text to create a high-res, dust-like effect
    const targetSphereScale = isTextState ? 0.035 : 0.20; 
    const targetCubeScale = isTextState ? 0.03 : 0.18;

    currentScales.current.sphere = THREE.MathUtils.lerp(currentScales.current.sphere, targetSphereScale, lerpSpeed);
    currentScales.current.cube = THREE.MathUtils.lerp(currentScales.current.cube, targetCubeScale, lerpSpeed);

    let i = 0;

    const updateParticle = (idx, baseScale, meshMain, instanceId, rotationFactor) => {
        // 1. Update Main Position
        currentPositions.current[idx] = THREE.MathUtils.lerp(currentPositions.current[idx], targetPositions![idx], lerpSpeed);
        currentPositions.current[idx+1] = THREE.MathUtils.lerp(currentPositions.current[idx+1], targetPositions![idx+1], lerpSpeed);
        currentPositions.current[idx+2] = THREE.MathUtils.lerp(currentPositions.current[idx+2], targetPositions![idx+2], lerpSpeed);

        let finalScale = baseScale;

        // Special Animation for Text State
        if (isTextState) {
            const age = time - textStateStartTime.current;
            const targetX = targetPositions![idx];
            
            // A. Initial Ripple Wave (Travels from left to right)
            // Wave starts at x = -15 and moves right. Speed 10.
            const wavePos = age * 12 - 15;
            const distToWave = Math.abs(targetX - wavePos);
            
            // Only active in first few seconds
            if (age < 3.5) {
                // Bell curve shape for ripple
                const rippleIntensity = Math.max(0, 1 - distToWave * 0.4); 
                finalScale += rippleIntensity * (baseScale * 2.0); // Pop up to 3x size momentarily
            }

            // B. Subtle Continuous Pulse
            // Sine wave based on position creates a shimmering gradient
            const pulse = Math.sin(time * 2 + targetX * 0.5);
            finalScale += pulse * (baseScale * 0.3);

        } else {
             // Standard breathing for other states
            const breatheAmp = 0.05;
            const breathing = Math.sin(time * 2 + i) * breatheAmp;
            finalScale += breathing;
        }
        
        const rotX = time * rotationFactor + i;
        const rotY = time * (rotationFactor * 0.5) + i;

        // Apply Main
        dummy.position.set(currentPositions.current[idx], currentPositions.current[idx+1], currentPositions.current[idx+2]);
        dummy.rotation.set(rotX, rotY, 0);
        dummy.scale.setScalar(finalScale);
        dummy.updateMatrix();
        meshMain.setMatrixAt(instanceId, dummy.matrix);
    };

    // Process Spheres
    for (let j = 0; j < SPHERE_COUNT; j++) {
      updateParticle(i * 3, currentScales.current.sphere, spheresRef.current, j, 0.2);
      i++;
    }

    // Process Cubes
    const cubeCount = TOTAL_PARTICLES - SPHERE_COUNT;
    for (let j = 0; j < cubeCount; j++) {
      updateParticle(i * 3, currentScales.current.cube, cubesRef.current, j, 0.5);
      i++;
    }

    spheresRef.current.instanceMatrix.needsUpdate = true;
    cubesRef.current.instanceMatrix.needsUpdate = true;
  });

  // Set colors
  const applyColors = (mesh: THREE.InstancedMesh, colorsArray: Float32Array, count: number) => {
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, new THREE.Color(colorsArray[i*3], colorsArray[i*3+1], colorsArray[i*3+2]));
    }
    mesh.instanceColor!.needsUpdate = true;
  };

  useEffect(() => {
    if (spheresRef.current && cubesRef.current) {
      applyColors(spheresRef.current, colors.spheres, SPHERE_COUNT);
      applyColors(cubesRef.current, colors.cubes, TOTAL_PARTICLES - SPHERE_COUNT);
    }
  }, [colors]);

  return (
    <group>
      {/* --- SPHERES --- */}
      <instancedMesh ref={spheresRef} args={[undefined, undefined, SPHERE_COUNT]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial metalness={0.9} roughness={0.15} envMapIntensity={1.5} />
      </instancedMesh>

      {/* --- CUBES --- */}
      <instancedMesh ref={cubesRef} args={[undefined, undefined, TOTAL_PARTICLES - SPHERE_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.8} roughness={0.2} envMapIntensity={1.2} />
      </instancedMesh>
    </group>
  );
};

export default MagicParticles;
