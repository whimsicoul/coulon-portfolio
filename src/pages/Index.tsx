import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Scene3D from '@/components/Portfolio/Scene3D';
import HeroSection from '@/components/Portfolio/HeroSection';
import BackButton from '@/components/Portfolio/BackButton';
import ProjectTitle from '@/components/Portfolio/ProjectTitle';
import FocusedCardOverlay from '@/components/Portfolio/FocusedCardOverlay';
import type { ComponentNode } from '@/data/projectData';

type AppState = 'hero' | 'selection' | 'transitioning' | 'exploded';

const SCROLL_SPEED = 0.6;
const ZOOM_MIN = -8;
const ZOOM_MAX = 6;

const SPACING_SCALE_MIN = 0.5;
const SPACING_SCALE_MAX = 2.0;
const SPACING_SCALE_DEFAULT = 1.0;
const SPACING_ZOOM_SPEED = 0.002;

const Index = () => {
  const [appState, setAppState] = useState<AppState>('hero');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [zoomedComponent, setZoomedComponent] = useState<ComponentNode | null>(null);
  const [scrollZoom, setScrollZoom] = useState(0);
  const scrollZoomRef = useRef(0);
  const [spacingScale, setSpacingScale] = useState(SPACING_SCALE_DEFAULT);
  const spacingScaleRef = useRef(SPACING_SCALE_DEFAULT);

  const handleViewProjects = useCallback(() => {
    setScrollZoom(0);
    scrollZoomRef.current = 0;
    setAppState('selection');
  }, []);

  // Called by Scene3D when the user clicks a card — begins the animation phase
  const handleSelectProject = useCallback((index: number) => {
    setSelectedProject(index);
    setZoomedComponent(null);
    setScrollZoom(0);
    scrollZoomRef.current = 0;
    setSpacingScale(SPACING_SCALE_DEFAULT);
    spacingScaleRef.current = SPACING_SCALE_DEFAULT;
    setAppState('transitioning');
  }, []);

  // Called by Scene3D when all entry animations have settled — finalises the state
  const handleTransitionComplete = useCallback(() => {
    setAppState('exploded');
  }, []);

  const handleBack = useCallback(() => {
    if (appState === 'exploded' || appState === 'transitioning') {
      setZoomedComponent(null);
      setSelectedProject(null);
      setScrollZoom(0);
      scrollZoomRef.current = 0;
      setSpacingScale(SPACING_SCALE_DEFAULT);
      spacingScaleRef.current = SPACING_SCALE_DEFAULT;
      setAppState('selection');
    } else if (appState === 'selection') {
      setAppState('hero');
    }
  }, [appState]);

  const handleNodeClick = useCallback((comp: ComponentNode) => {
    setZoomedComponent(comp);
  }, []);

  // Escape key clears focused node
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedComponent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Scroll wheel handler — hero: moves camera; exploded/transitioning: scales card spacing
  // In selection state OrbitControls handles zoom natively
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (appState === 'hero') {
        e.preventDefault();
        const delta = e.deltaY * SCROLL_SPEED * 0.05;
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scrollZoomRef.current + delta));
        scrollZoomRef.current = next;
        setScrollZoom(next);
      } else if (appState === 'exploded' || appState === 'transitioning') {
        e.preventDefault();
        const delta = e.deltaY * SPACING_ZOOM_SPEED;
        const next = Math.min(SPACING_SCALE_MAX, Math.max(SPACING_SCALE_MIN, spacingScaleRef.current + delta));
        spacingScaleRef.current = next;
        setSpacingScale(next);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [appState]);

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Background gradient — clipped to viewport, behind everything */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ zIndex: -1, pointerEvents: 'none' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 15%, hsl(220, 22%, 10%) 0%, transparent 70%),
              linear-gradient(160deg, hsl(230, 25%, 4%) 0%, hsl(220, 20%, 7%) 50%, hsl(215, 15%, 9%) 100%)
            `
          }}
        />
      </div>

      {/* 3D Scene — always mounted, no clip ancestor so Html overlays can animate freely */}
      <Scene3D
        appState={appState}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onTransitionComplete={handleTransitionComplete}
        onZoomComponent={handleNodeClick}
        zoomedComponentId={zoomedComponent?.id ?? null}
        scrollZoom={scrollZoom}
        spacingScale={spacingScale}
      />

      {/* 2D Overlays */}
      <AnimatePresence>
        {appState === 'hero' && <HeroSection onViewProjects={handleViewProjects} />}
      </AnimatePresence>
      <BackButton
        visible={appState !== 'hero' && appState !== 'transitioning'}
        onClick={handleBack}
        label={appState === 'exploded' ? 'Back to Projects' : 'Back'}
      />
      <ProjectTitle
        projectIndex={selectedProject}
        visible={appState === 'exploded'}
      />

      {/* Focused card overlay — portal to body, perfectly centered, no R3F artifacts */}
      {zoomedComponent && (
        <FocusedCardOverlay
          node={zoomedComponent}
          onClose={() => setZoomedComponent(null)}
        />
      )}
    </div>
  );
};

export default Index;
