import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingNodeProps {
  position: [number, number, number];
  color: string;
  onClick: () => void;
  delay?: number;
  visible?: boolean;
}

const FloatingNode = ({ position, color, onClick, delay = 0, visible = true }: FloatingNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [animatedY] = useState(() => Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + animatedY + delay) * 0.08;

    const targetScale = hovered ? 1.08 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  if (!visible) return null;

  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <RoundedBox args={[2.4, 0.7, 0.08]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            color='#1e293b'
            emissive={color}
            emissiveIntensity={hovered ? 0.3 : 0.12}
            transparent
            opacity={0.92}
            metalness={0.1}
            roughness={0.6}
          />
        </RoundedBox>
      </mesh>
    </group>
  );
};

export default FloatingNode;
