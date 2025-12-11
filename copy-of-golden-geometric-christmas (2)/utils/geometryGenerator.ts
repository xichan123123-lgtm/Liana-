
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();

// 1. Tree Shape Generator (Cone Volume/Surface)
export const generateTreePositions = (count: number): Float32Array => {
  const data = new Float32Array(count * 3);
  const height = 12;
  const maxRadius = 5;

  for (let i = 0; i < count; i++) {
    // Normalized height (0 at top, 1 at bottom)
    const yNorm = Math.pow(Math.random(), 0.8); 
    const y = 6 - (yNorm * height); // range roughly 6 to -6

    // Radius depends on height
    const r = yNorm * maxRadius * Math.sqrt(Math.random()); // Random spread inside cone
    
    // Spiral angle
    const theta = i * 0.5 + Math.random() * Math.PI * 2; 

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    data[i * 3] = x;
    data[i * 3 + 1] = y;
    data[i * 3 + 2] = z;
  }
  return data;
};

// 2. Explosion Shape Generator (Sphere Volume)
export const generateExplosionPositions = (count: number): Float32Array => {
  const data = new Float32Array(count * 3);
  const radius = 15;

  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random()); // Even distribution in sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    data[i * 3] = x;
    data[i * 3 + 1] = y;
    data[i * 3 + 2] = z;
  }
  return data;
};

// Helper: Calculate total area and cumulative weights for a geometry
const analyzeGeometry = (geometry: THREE.BufferGeometry) => {
  const posAttribute = geometry.attributes.position;
  const faceCount = posAttribute.count / 3;
  const weights = new Float32Array(faceCount);
  let totalArea = 0;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (let i = 0; i < faceCount; i++) {
    const i0 = i * 3;
    const i1 = i * 3 + 1;
    const i2 = i * 3 + 2;

    vA.fromBufferAttribute(posAttribute, i0);
    vB.fromBufferAttribute(posAttribute, i1);
    vC.fromBufferAttribute(posAttribute, i2);

    tempVecA.subVectors(vB, vA);
    tempVecB.subVectors(vC, vA);
    tempVecA.cross(tempVecB);
    
    const area = 0.5 * tempVecA.length();
    totalArea += area;
    weights[i] = totalArea;
  }
  return { weights, totalArea, faceCount, posAttribute };
};

// Helper: Sample a point from a specific geometry info
const samplePoint = (info: any, target: Float32Array, index: number) => {
   const r = Math.random() * info.totalArea;
   
   // Binary search for face
   let lower = 0;
   let upper = info.faceCount - 1;
   let faceIndex = 0;

   while (lower <= upper) {
      const mid = Math.floor((lower + upper) / 2);
      if (info.weights[mid] < r) {
         lower = mid + 1;
      } else {
         upper = mid - 1;
         faceIndex = mid;
      }
   }

   const i0 = faceIndex * 3;
   const i1 = faceIndex * 3 + 1;
   const i2 = faceIndex * 3 + 2;

   const vA = new THREE.Vector3().fromBufferAttribute(info.posAttribute, i0);
   const vB = new THREE.Vector3().fromBufferAttribute(info.posAttribute, i1);
   const vC = new THREE.Vector3().fromBufferAttribute(info.posAttribute, i2);

   let r1 = Math.random();
   let r2 = Math.random();
   if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
   const r3 = 1 - r1 - r2;

   target[index * 3] = vA.x * r1 + vB.x * r2 + vC.x * r3;
   target[index * 3 + 1] = vA.y * r1 + vB.y * r2 + vC.y * r3;
   target[index * 3 + 2] = vA.z * r1 + vB.z * r2 + vC.z * r3;
}

// 3. Text Shape Generator (Dual Line Centered)
export const generateTextPositions = (font: Font, count: number): Float32Array => {
  // Create Top Line
  const geoTop = new TextGeometry('Dear Liana', {
    font: font, size: 1.3, depth: 0.04, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.005, bevelSegments: 2
  });
  geoTop.center();
  geoTop.translate(0, 1.2, 0); // Move Up

  // Create Bottom Line
  const geoBottom = new TextGeometry('MERRY CHRISTMAS', {
    font: font, size: 1.3, depth: 0.04, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.005, bevelSegments: 2
  });
  geoBottom.center();
  geoBottom.translate(0, -1.2, 0); // Move Down

  // Analyze both
  const infoTop = analyzeGeometry(geoTop);
  const infoBottom = analyzeGeometry(geoBottom);

  const totalCombinedArea = infoTop.totalArea + infoBottom.totalArea;
  const data = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Decide which word to sample based on area
    // This ensures constant density across both lines
    if (Math.random() < (infoTop.totalArea / totalCombinedArea)) {
        samplePoint(infoTop, data, i);
    } else {
        samplePoint(infoBottom, data, i);
    }
  }
  
  return data;
}
