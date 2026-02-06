
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ColorType } from '../types';

interface CubeMeshProps {
  faces: {
    top: ColorType;
    bottom: ColorType;
    front: ColorType;
    back: ColorType;
    left: ColorType;
    right: ColorType;
  };
  isRolling: boolean;
  rollDirection: 'up' | 'down' | 'left' | 'right' | null;
  onRollComplete: () => void;
}

const CubeMesh: React.FC<CubeMeshProps> = ({ faces, isRolling, rollDirection, onRollComplete }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const animationStartTime = useRef<number | null>(null);

  // Material mapping for Three.js BoxGeometry:
  // 0: +X (Right)
  // 1: -X (Left)
  // 2: +Y (Top)
  // 3: -Y (Bottom)
  // 4: +Z (Front)
  // 5: -Z (Back)
  const faceColors = [
    faces.right,
    faces.left,
    faces.top,
    faces.bottom,
    faces.front,
    faces.back
  ];

  // Initialize and Reset behavior
  useEffect(() => {
    if (isRolling && rollDirection && pivotRef.current && meshRef.current) {
      animationStartTime.current = performance.now();
      
      // Reset pivot to center for calculation
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.rotation.set(0, 0, 0);
      
      // Move mesh to default local position (centered at Y=0.5)
      meshRef.current.position.set(0, 0.5, 0);

      // Shift pivot to the edge we're rolling around
      let pivotX = 0;
      let pivotZ = 0;

      switch (rollDirection) {
        case 'up': pivotZ = 0.5; break;
        case 'down': pivotZ = -0.5; break;
        case 'left': pivotX = -0.5; break;
        case 'right': pivotX = 0.5; break;
      }

      pivotRef.current.position.set(pivotX, 0, pivotZ);
      // Offset mesh so it stays in same world position initially
      meshRef.current.position.set(-pivotX, 0.5, -pivotZ);
    } else if (!isRolling) {
      // Ensure total reset when not rolling
      if (pivotRef.current && meshRef.current) {
        pivotRef.current.position.set(0, 0, 0);
        pivotRef.current.rotation.set(0, 0, 0);
        meshRef.current.position.set(0, 0.5, 0);
      }
    }
  }, [isRolling, rollDirection]);

  useFrame(() => {
    if (isRolling && rollDirection && animationStartTime.current && pivotRef.current) {
      const now = performance.now();
      const elapsed = (now - animationStartTime.current) / 1000;
      const duration = 0.5;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth interpolation
      const eased = progress * progress * (3 - 2 * progress);
      const angle = eased * (Math.PI / 2);

      switch (rollDirection) {
        case 'up': 
          pivotRef.current.rotation.x = angle; 
          break;
        case 'down': 
          pivotRef.current.rotation.x = -angle; 
          break;
        case 'left': 
          pivotRef.current.rotation.z = angle; 
          break;
        case 'right': 
          pivotRef.current.rotation.z = -angle; 
          break;
      }

      if (progress >= 1) {
        animationStartTime.current = null;
        onRollComplete();
      }
    }
  });

  return (
    <group ref={pivotRef}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        {faceColors.map((color, idx) => (
          <meshStandardMaterial key={`${idx}-${color}`} attach={`material-${idx}`} color={color} />
        ))}
      </mesh>
    </group>
  );
};

export default CubeMesh;
