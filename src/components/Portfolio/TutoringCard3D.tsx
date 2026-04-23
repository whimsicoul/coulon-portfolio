import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Text3D, Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface TutoringCard3DProps {
  position: [number, number, number];
  title: string;
  subtitle: string;
  onClick: () => void;
  delay?: number;
  isEjecting?: boolean;
  ejectDirection?: [number, number];
}

const TutoringCard3D = ({
  position,
  title,
  subtitle,
  onClick,
  delay = 0,
  isEjecting = false,
  ejectDirection = [1, 1],
}: TutoringCard3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // ── Entry spring state ────────────────────────────────────────────────────
  const springY   = useRef(position[1] - 14 - delay * 0.5);
  const springVY  = useRef(0);
  const entryDone = useRef(false);
  const exitY     = useRef(position[1]);

  // ── Tumble — seed with delay so cards don't rotate in lockstep ───────────
  const tumble = useRef({ x: delay * 0.4, y: delay * 0.9, z: delay * 0.2 });

  // ── Ejection timing ───────────────────────────────────────────────────────
  const ejectionStartTime = useRef(0);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isEjecting) return;
    document.body.style.cursor = 'auto';
    onClick();
  };

  // Load the cherry blossom tree model
  const { scene: treeScene } = useGLTF('/models/low-_poly_cherry_blossom_tree_3d_models.glb');

  const treeModel = useMemo(() => {
    const cloned = treeScene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [treeScene]);

  // Auto-fit: scale model to ~1.5 units tall, centered at origin
  const { treeScale, treeOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(treeModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 1.5 / size.y;
    return {
      treeScale: s,
      treeOffset: new THREE.Vector3(
        -center.x * s,
        -box.min.y * s,
        -center.z * s,
      ),
    };
  }, [treeModel]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // ── Spring float-away (launches upward on eject) ─────────────────────────
    if (isEjecting) {
      if (ejectionStartTime.current === 0) {
        ejectionStartTime.current = state.clock.elapsedTime;
        springVY.current = 8;
        exitY.current = groupRef.current.position.y;
      }

      const target = position[1] + 18;
      const force = 18 * (target - exitY.current);
      const accel = force / 12;
      springVY.current += (accel - (28 / 12) * springVY.current) * delta;
      exitY.current += springVY.current * delta;

      groupRef.current.position.y = exitY.current;
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];

      const elapsed = state.clock.elapsedTime - ejectionStartTime.current;
      const fadeT = Math.min(elapsed / 1.0, 1.0);
      const opacity = Math.max(0, 1 - fadeT);
      groupRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.transparent = true;
          mat.opacity = opacity;
        }
      });

      const spin = 1 + elapsed * 4;
      tumble.current.x += 0.00055 * spin;
      tumble.current.y += 0.0018  * spin;
      tumble.current.z += 0.00035 * spin;
      groupRef.current.rotation.x = tumble.current.x;
      groupRef.current.rotation.y = tumble.current.y;
      groupRef.current.rotation.z = tumble.current.z;
      return;
    }

    // Reset ejection clock when not ejecting
    ejectionStartTime.current = 0;

    // ── Entry spring ──────────────────────────────────────────────────────
    if (!entryDone.current) {
      const target = position[1];
      const force = 18 * (target - springY.current);
      const accel = force / 12;
      springVY.current += (accel - (28 / 12) * springVY.current) * delta;
      springY.current  += springVY.current * delta;
      groupRef.current.position.y = springY.current;
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      if (Math.abs(springY.current - target) < 0.01 && Math.abs(springVY.current) < 0.01) {
        springY.current = target;
        entryDone.current = true;
      }
      tumble.current.x += 0.00055;
      tumble.current.y += 0.0018;
      tumble.current.z += 0.00035;
      groupRef.current.rotation.x = tumble.current.x;
      groupRef.current.rotation.y = tumble.current.y;
      groupRef.current.rotation.z = tumble.current.z;

      groupRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.transparent = false;
          mat.opacity = 1;
        }
      });
      groupRef.current.scale.setScalar(1);
      return;
    }

    // ── Resting state ─────────────────────────────────────────────────────
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.6 + delay) * 0.15;
    tumble.current.x += 0.00055;
    tumble.current.y += 0.0018;
    tumble.current.z += 0.00035;
    groupRef.current.rotation.x = tumble.current.x;
    groupRef.current.rotation.y = tumble.current.y;
    groupRef.current.rotation.z = tumble.current.z;
    const targetScale = hovered ? 1.06 : 1;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Cherry blossom tree model */}
      <group position={[treeOffset.x, -0.55 + treeOffset.y, 0.32 + treeOffset.z]}>
        <primitive object={treeModel} scale={treeScale} />
      </group>

      {/* 3D title text */}
      <Center position={[0, -1.05, 0.32]}>
        <Text3D
          font="/fonts/Cinzel_Regular.json"
          size={0.28}
          height={0.06}
          bevelEnabled
          bevelSize={0.012}
          bevelThickness={0.018}
          bevelSegments={8}
          curveSegments={16}
        >
          DC SAT Tutor
          <meshPhysicalMaterial
            color="#f9a8d4"
            roughness={0.3}
            metalness={0.1}
            emissive="#f9a8d4"
            emissiveIntensity={0.12}
            clearcoat={0.6}
            clearcoatRoughness={0.1}
            transparent
          />
        </Text3D>
      </Center>
    </group>
  );
};

export default TutoringCard3D;

useGLTF.preload('/models/low-_poly_cherry_blossom_tree_3d_models.glb');
