import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import ChessCard3D from './ChessCard3D';
import TutoringCard3D from './TutoringCard3D';
import FloatingInfoCard from './FloatingInfoCard';
import SpaceBackground from './SpaceBackground';
import { ISSCorner, AnimatedAstronaut, AsteroidPack, ASTRONAUT_START } from './SpaceScene';
import { projects } from '@/data/projectData';
import type { ComponentNode, Project } from '@/data/projectData';

type AppState = 'hero' | 'selection' | 'transitioning' | 'exploded';

// ─── CameraController ─────────────────────────────────────────────────────────
// Handles programmatic camera movement for hero + selection states only.
// Returns null (does nothing) when appState === 'exploded' so OrbitControls
// can own the camera without conflicts.

interface CameraControllerProps {
  appState: AppState;
  selectedProject: number | null;
  scrollZoom: number;
}

function CameraController({ appState, selectedProject, scrollZoom }: CameraControllerProps) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(-1.3, 1.5, 12));
  const targetLook = useRef(new THREE.Vector3(-1.3, 1.0, 0));
  const currentLook = useRef(new THREE.Vector3(-1.3, 1.0, 0));

  useEffect(() => {
    if (appState === 'hero') {
      targetPos.current.set(-1.3, 1.5, 12 + scrollZoom);
      targetLook.current.set(-1.3, 1.0, 0);
    } else if (appState === 'selection') {
      targetPos.current.set(0, 0, 8 + scrollZoom);
      targetLook.current.set(0, 0, 0);
    }
  }, [appState, selectedProject, scrollZoom]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.06);
    currentLook.current.lerp(targetLook.current, 0.06);
    camera.lookAt(currentLook.current);
  });

  return null;
}

// ─── EntrySetup ───────────────────────────────────────────────────────────────
// Fires once on mount — snaps the camera to a given position and OrbitControls
// target so the view is correct the moment OrbitControls takes over.
// Guards against snapping if camera is already close to the target position,
// preventing a jarring jump when the transition animation lands nearby.

interface EntrySetupProps {
  orbitRef: React.RefObject<OrbitControlsImpl>;
  cameraPos: [number, number, number];
  target: [number, number, number];
}

function EntrySetup({ orbitRef, cameraPos, target }: EntrySetupProps) {
  const { camera } = useThree();
  useEffect(() => {
    const dist = camera.position.distanceTo(new THREE.Vector3(...cameraPos));
    if (dist > 2.5) camera.position.set(...cameraPos);
    if (orbitRef.current) {
      orbitRef.current.target.set(...target);
      orbitRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── FocusController ──────────────────────────────────────────────────────────
// Smoothly moves the camera to focus on a clicked node by lerping both
// camera.position and OrbitControls.target so subsequent orbit drags pivot
// around the newly focused node.

interface FocusControllerProps {
  orbitRef: React.RefObject<OrbitControlsImpl>;
  zoomedComponentId: string | null;
  project: Project | null;
  spacingScale: number;
}


const OVERVIEW_POS = new THREE.Vector3(-1.3, 1.5, 12);
const OVERVIEW_TARGET = new THREE.Vector3(-1.3, 1.0, 0);

function FocusController({ orbitRef, zoomedComponentId, project, spacingScale }: FocusControllerProps) {
  const { camera } = useThree();
  const focusPos = useRef<THREE.Vector3 | null>(null);
  const focusTarget = useRef<THREE.Vector3 | null>(null);
  // 'idle' | 'focusing' | 'returning'
  const mode = useRef<'idle' | 'focusing' | 'returning'>('idle');
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    if (zoomedComponentId && project) {
      const comp = project.components.find((c) => c.id === zoomedComponentId);
      if (!comp) return;
      const [bx, by, bz] = comp.position;
      const x = bx * spacingScale;
      const y = by * spacingScale;
      const z = bz * spacingScale;
      focusPos.current = new THREE.Vector3(x, y + 0.5, z + 7);
      focusTarget.current = new THREE.Vector3(x, y, z);
      mode.current = 'focusing';
      hasFocusedOnce.current = true;
    } else if (hasFocusedOnce.current) {
      // Only fly back if we actually focused on something first
      focusPos.current = OVERVIEW_POS.clone();
      focusTarget.current = OVERVIEW_TARGET.clone();
      mode.current = 'returning';
    }
  }, [zoomedComponentId, project, spacingScale]);

  useFrame(() => {
    if (mode.current === 'idle' || !focusPos.current || !focusTarget.current || !orbitRef.current) return;
    camera.position.lerp(focusPos.current, 0.08);
    orbitRef.current.target.lerp(focusTarget.current, 0.08);
    orbitRef.current.update();
    if (camera.position.distanceTo(focusPos.current) < 0.1) {
      camera.position.copy(focusPos.current);
      orbitRef.current.target.copy(focusTarget.current);
      orbitRef.current.update();
      mode.current = 'idle';
    }
  });

  return null;
}

// ─── SceneContent ─────────────────────────────────────────────────────────────

interface SceneContentProps {
  appState: AppState;
  selectedProject: number | null;
  onSelectProject: (index: number) => void;
  onTransitionComplete: () => void;
  onZoomComponent: (comp: ComponentNode) => void;
  zoomedComponentId: string | null;
  scrollZoom: number;
  spacingScale: number;
}

function scalePosition(base: [number, number, number], scale: number): [number, number, number] {
  return [base[0] * scale, base[1] * scale, base[2] * scale];
}

function SceneContent({
  appState,
  selectedProject,
  onSelectProject,
  onTransitionComplete,
  onZoomComponent,
  zoomedComponentId,
  scrollZoom,
  spacingScale,
}: SceneContentProps) {
  const selectionOrbitRef = useRef<OrbitControlsImpl>(null);
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const [readyStage, setReadyStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setReadyStage(1), 1500);
    const t2 = setTimeout(() => setReadyStage(2), 3000);
    const t3 = setTimeout(() => setReadyStage(3), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // ── Transition phase tracking ─────────────────────────────────────────────
  // Uses refs so phase changes don't trigger re-renders mid-animation.
  // ejectingProject (useState) is the only signal that causes re-renders —
  // set on click to start the visual, cleared at end to unmount selection cards.
  const [ejectingProject, setEjectingProject] = useState<number | null>(null);
  const transitionPhase = useRef<'idle' | 'ejecting'>('idle');
  const transitionStartMs = useRef(0);

  const animKeyRef = useRef(0);
  const [animKey, setAnimKey] = useState(0);

  const handleCardClick = (index: number) => {
    if (transitionPhase.current !== 'idle') return;
    transitionPhase.current = 'ejecting';
    transitionStartMs.current = performance.now();
    animKeyRef.current += 1;
    setAnimKey(animKeyRef.current);
    setEjectingProject(index);
  };

  // At 1000ms: icons are off screen → go straight to exploded
  useFrame(() => {
    if (transitionPhase.current === 'idle' || ejectingProject === null) return;
    const elapsed = performance.now() - transitionStartMs.current;

    if (transitionPhase.current === 'ejecting' && elapsed >= 1000) {
      transitionPhase.current = 'idle';
      setEjectingProject(null);
      onSelectProject(ejectingProject);
      onTransitionComplete();
    }
  });

  const isEjecting = ejectingProject !== null;

  // Selection cards visible during selection OR while ejecting
  const showCards = appState === 'selection' || isEjecting;

  // FloatingInfoCards appear only after icons have floated away
  const showExploded = appState === 'exploded';

  const project: Project | null = selectedProject !== null ? projects[selectedProject] : null;

  // Sort components by distance from origin so inner cards animate first —
  // creates an outward stagger rather than an arbitrary order
  const sortedComponents = useMemo(() => {
    if (!project) return [];
    return [...project.components].sort((a, b) => {
      const dA = Math.hypot(a.position[0], a.position[1], a.position[2]);
      const dB = Math.hypot(b.position[0], b.position[1], b.position[2]);
      return dA - dB;
    });
  }, [project]);

  // Per-frame z-index map: card id → CSS z-index based on camera distance
  const [cardZIndexes, setCardZIndexes] = useState<Record<string, number>>({});
  const prevOrderRef = useRef<string>('');
  const { camera } = useThree();

  useFrame(() => {
    if (!showExploded || !project) return;
    const distances = project.components.map((comp) => ({
      id: comp.id,
      dist: camera.position.distanceTo(new THREE.Vector3(
        comp.position[0] * spacingScale,
        comp.position[1] * spacingScale,
        comp.position[2] * spacingScale,
      )),
    }));
    const sorted = [...distances].sort((a, b) => a.dist - b.dist);
    const orderKey = sorted.map((d) => d.id).join(',');
    if (orderKey === prevOrderRef.current) return;
    prevOrderRef.current = orderKey;
    const total = sorted.length;
    const next: Record<string, number> = {};
    sorted.forEach((item, rank) => {
      next[item.id] = total - rank;
    });
    setCardZIndexes(next);
  });

  return (
    <>
      {/* Programmatic camera — only for hero state */}
      {appState === 'hero' && (
        <CameraController
          appState={appState}
          selectedProject={selectedProject}
          scrollZoom={scrollZoom}
        />
      )}

      {/* OrbitControls for selection state — disabled once ejection begins */}
      {appState === 'selection' && !isEjecting && (
        <>
          <OrbitControls
            ref={selectionOrbitRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={4}
            maxDistance={18}
            makeDefault
          />
          <EntrySetup orbitRef={selectionOrbitRef} cameraPos={[0, 0, 8]} target={[0, 0, 0]} />
        </>
      )}

      {/* OrbitControls + exploded helpers — only after appState is truly exploded */}
      {appState === 'exploded' && selectedProject !== null && (
        <>
          <OrbitControls
            ref={orbitRef}
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={3}
            maxDistance={30}
            makeDefault
          />
          <EntrySetup orbitRef={orbitRef} cameraPos={[0, 0.0, 20]} target={[0, 0.0, 0]} />
          <FocusController
            orbitRef={orbitRef}
            zoomedComponentId={zoomedComponentId}
            project={project}
            spacingScale={spacingScale}
          />
        </>
      )}

      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]}   intensity={0.6} color="#38bdf8" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#a78bfa" />
      <Environment preset="night" />
      <SpaceBackground />
      {readyStage >= 1 && <Suspense fallback={null}>
        <AsteroidPack />
      </Suspense>}
      {readyStage >= 2 && <Suspense fallback={null}>
        <AnimatedAstronaut position={ASTRONAUT_START} scale={0.9} bobOffset={2.5} bobSpeed={0.15} drift={true} driftSpeed={0.8} />
      </Suspense>}
      {readyStage >= 3 && <Suspense fallback={null}>
        <ISSCorner />
      </Suspense>}

      {/* Project selection cards */}
      {showCards && (
        <>
          <group scale={2}>
            <ChessCard3D
              position={[-2.2, 0, 0]}
              onClick={() => handleCardClick(0)}
              delay={0}
              isEjecting={isEjecting}
              ejectDirection={[-1, 1]}
            />
          </group>
          <group scale={2}>
            <TutoringCard3D
              position={[2.2, 0, 0]}
              title={projects[1].title}
              subtitle={projects[1].subtitle}
              onClick={() => handleCardClick(1)}
              delay={2}
              isEjecting={isEjecting}
              ejectDirection={[1, 1]}
            />
          </group>
        </>
      )}

      {/* Exploded 3D component cards — sorted inner-first for outward stagger */}
      {showExploded && project && (
        <>
          {sortedComponents.map((comp, i) => {
            const isFocused = comp.id === zoomedComponentId;
            const depthZIndex = cardZIndexes[comp.id] ?? 1;
            const zIndex = isFocused ? 1000 : depthZIndex;
            const scaledPos = scalePosition(comp.position, spacingScale);
            return (
              <FloatingInfoCard
                key={comp.id}
                node={comp}
                position={scaledPos}
                index={i}
                animKey={animKey}
                onClick={() => onZoomComponent(comp)}
                zIndex={zIndex}
                isFocused={isFocused}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ─── Scene3D ──────────────────────────────────────────────────────────────────

interface Scene3DProps {
  appState: AppState;
  selectedProject: number | null;
  onSelectProject: (index: number) => void;
  onTransitionComplete: () => void;
  onZoomComponent: (comp: ComponentNode) => void;
  zoomedComponentId: string | null;
  scrollZoom: number;
  spacingScale: number;
}

const Scene3D = ({
  appState,
  selectedProject,
  onSelectProject,
  onTransitionComplete,
  onZoomComponent,
  zoomedComponentId,
  scrollZoom,
  spacingScale,
}: Scene3DProps) => {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent
          appState={appState}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          onTransitionComplete={onTransitionComplete}
          onZoomComponent={onZoomComponent}
          zoomedComponentId={zoomedComponentId}
          scrollZoom={scrollZoom}
          spacingScale={spacingScale}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;
