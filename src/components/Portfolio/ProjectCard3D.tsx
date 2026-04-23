import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface ProjectCard3DProps {
  position: [number, number, number];
  title: string;
  subtitle: string;
  onClick: () => void;
  delay?: number;
  isEjecting?: boolean;
  ejectDirection?: [number, number];
}

const ProjectCard3D = ({
  position,
  title,
  subtitle,
  onClick,
  delay = 0,
  isEjecting = false,
  ejectDirection = [1, 1],
}: ProjectCard3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
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

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // ── Spring float-away (mirrors entry, launches upward) ───────────────────
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
      if (materialRef.current) {
        materialRef.current.opacity = 0.95 * Math.max(0, 1 - fadeT);
      }

      const spin = 1 + elapsed * 4;
      tumble.current.x += 0.00055 * spin;
      tumble.current.y += 0.0018  * spin;
      tumble.current.z += 0.00035 * spin;
      groupRef.current.rotation.x = tumble.current.x;
      groupRef.current.rotation.y = tumble.current.y;
      groupRef.current.rotation.z = tumble.current.z;
      return;
    }

    // Reset ejection clock when not ejecting (handles re-mount on back navigation)
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

      // Restore material opacity and scale in case we re-entered after ejection
      if (materialRef.current) materialRef.current.opacity = 0.95;
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
    <group ref={groupRef} position={position}>
      <mesh
        onClick={handleClick}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <RoundedBox args={[3.5, 2.2, 0.12]} radius={0.12} smoothness={4}>
          <meshStandardMaterial
            ref={materialRef}
            color={hovered ? '#1e3a5f' : '#141c2e'}
            emissive={hovered ? '#38bdf8' : '#1e293b'}
            emissiveIntensity={hovered ? 0.2 : 0.05}
            transparent
            opacity={0.95}
            metalness={0.15}
            roughness={0.5}
          />
        </RoundedBox>
      </mesh>

      {/* Glow border */}
      {hovered && (
        <mesh>
          <RoundedBox args={[3.6, 2.3, 0.06]} radius={0.12} smoothness={4}>
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={0.5}
              transparent
              opacity={0.15}
            />
          </RoundedBox>
        </mesh>
      )}

      <Html center distanceFactor={6} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div
          className="text-center w-48"
          style={{ opacity: isEjecting ? 0 : 1, transition: 'opacity 0.2s ease' }}
        >
          <h3 className="text-sm font-display font-bold text-foreground mb-1">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </Html>
    </group>
  );
};

export default ProjectCard3D;
