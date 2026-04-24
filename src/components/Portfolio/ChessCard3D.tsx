import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Text3D, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Arched text layout
// ---------------------------------------------------------------------------
const ARC_CENTER: [number, number, number] = [0, 0.10, 0.35];
const ARC_RADIUS = 1.02;
const ARC_SPAN = (150 * Math.PI) / 180;
const ARC_START = Math.PI / 2 + ARC_SPAN / 2;
const ARC_END   = Math.PI / 2 - ARC_SPAN / 2;

const ARCH_TEXT = 'CHESS OPENING ANALYZER';

function buildArchLayout(text: string) {
  const n = text.length;
  return text.split('').map((char, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const theta = ARC_START + (ARC_END - ARC_START) * t;
    const x = ARC_CENTER[0] + ARC_RADIUS * Math.cos(theta);
    const y = ARC_CENTER[1] + ARC_RADIUS * Math.sin(theta);
    const z = ARC_CENTER[2];
    const rotZ = theta - Math.PI / 2;
    return { char, x, y, z, rotZ };
  });
}

interface ChessCard3DProps {
  position: [number, number, number];
  onClick: () => void;
  delay?: number;
  isEjecting?: boolean;
  ejectDirection?: [number, number];
}

// ---------------------------------------------------------------------------
// Marble shader material factory
// Injects procedural veining into the fragment shader using world-space coords.
// ---------------------------------------------------------------------------
function makeMarbleShaderMaterial(opts: {
  baseColor: THREE.ColorRepresentation;
  veinColor: THREE.ColorRepresentation;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
}): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.baseColor,
    roughness: opts.roughness,
    metalness: opts.metalness,
    clearcoat: opts.clearcoat ?? 0.9,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.05,
    envMapIntensity: 1.4,
  });
  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.0;
  }

  const veinColorVec = new THREE.Color(opts.veinColor);

  mat.onBeforeCompile = (shader) => {
    // --- uniform injection ---
    shader.uniforms.uVeinColor = { value: veinColorVec };

    // --- vertex: pass world position ---
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = worldPosition.xyz;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'varying vec3 vWorldPos;\nvoid main() {'
    );

    // --- fragment: procedural marble veining ---
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `
uniform vec3 uVeinColor;
varying vec3 vWorldPos;

// Cheap hash-based noise
float hash(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float smoothNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),           hash(i+vec3(1,0,0)),f.x),
        mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
        mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++) { v += a*smoothNoise(p); p*=2.1; a*=0.5; }
  return v;
}

void main() {`
    );

    // Inject vein blend just before gl_FragColor assignment
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `
  // -- marble veining --
  vec3 wp = vWorldPos * 4.5;
  float noise = fbm(wp);
  // Sine wave veins distorted by fbm noise
  float vein = sin((wp.x + wp.y * 0.4 + noise * 3.0) * 6.0);
  float vein2 = sin((wp.z * 0.7 + wp.y + noise * 2.5) * 8.0);
  float veins = clamp(pow(abs(vein * vein2), 1.4) * 2.5, 0.0, 1.0);
  vec3 marbled = mix(gl_FragColor.rgb, uVeinColor, veins * 0.68);
  gl_FragColor = vec4(marbled, gl_FragColor.a);

  #include <output_fragment>`
    );
  };

  return mat;
}

// ---------------------------------------------------------------------------
// Brushed gold material — high-specular with subtle anisotropic tint variation
// ---------------------------------------------------------------------------
function makeBrushedGoldMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#B8882A',
    metalness: 1.0,
    roughness: 0.18,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
    envMapIntensity: 2.0,
    reflectivity: 1.0,
  });
  // Tint the clearcoat slightly warm
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `
  // Warm micro-shimmer from angle
  float shimmer = pow(clamp(dot(normalize(vNormal), vec3(0.577,0.577,0.577)), 0.0, 1.0), 6.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.88, 0.45), shimmer * 0.25);
  #include <output_fragment>`
    );
  };
  return mat;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ChessCard3D = ({
  position,
  onClick,
  delay = 0,
  isEjecting = false,
  ejectDirection = [-1, 1],
}: ChessCard3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const archLayout = useMemo(() => buildArchLayout(ARCH_TEXT), []);

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

  // Create materials once — marble for piece, dark marble for plinth
  const whiteMarbMat = useMemo(() => makeMarbleShaderMaterial({
    baseColor: '#f5f2ee',
    veinColor: '#6a6a78',
    roughness: 0.05,
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  }), []);

  const goldMat = useMemo(() => makeBrushedGoldMaterial(), []);

  // Load the high-poly GLB king model
  const { scene: kingScene } = useGLTF('/assets3d/king.glb');

  // Clone the cached scene — marble material is baked into the GLB
  const kingModel = useMemo(() => {
    const cloned = kingScene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [kingScene]);

  // Auto-fit: compute scale and offset so piece is ~1.5 units tall, sitting at y=0
  const { kingScale, kingOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(kingModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 1.5 / size.y;
    return {
      kingScale: s,
      kingOffset: new THREE.Vector3(
        -center.x * s,
        -box.min.y * s,
        -center.z * s,
      ),
    };
  }, [kingModel]);

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

      // Restore opacity and scale in case we re-entered after ejection
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
      {/* Isolated 3D scene — no card body, no plinth */}
      <group position={[0, 0.05, 0.07]}>

        {/* ── Arched brushed-gold 3D text ── */}
        {archLayout.map(({ char, x, y, z, rotZ }, i) => (
          <Text3D
            key={i}
            font="/fonts/Cinzel_Regular.json"
            size={0.135}
            height={0.055}
            bevelEnabled
            bevelSize={0.018}
            bevelThickness={0.022}
            bevelSegments={10}
            curveSegments={20}
            position={[x - 0.04 * Math.cos(rotZ), y - 0.04 * Math.sin(rotZ), z]}
            rotation={[0, 0, rotZ]}
          >
            {char}
            <primitive object={goldMat} attach="material" />
          </Text3D>
        ))}

        {/* ── King piece — floating, no plinth ── */}
        <group position={[kingOffset.x, -0.55 + kingOffset.y, 0.32 + kingOffset.z]}>
          <primitive object={kingModel} scale={kingScale} />
        </group>

      </group>
    </group>
  );
};

export default ChessCard3D;

useGLTF.preload('/assets3d/king.glb');
