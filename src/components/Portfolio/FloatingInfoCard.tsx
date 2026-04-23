import { useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import type { ComponentNode } from '@/data/projectData';

interface FloatingInfoCardProps {
  node: ComponentNode;
  index: number;
  animKey: number;
  onClick: () => void;
  zIndex?: number;
  isFocused?: boolean;
  position?: [number, number, number];
}

const categoryLabels: Record<string, string> = {
  core: 'Core',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  feature: 'Feature',
};

const FloatingInfoCard = ({ node, index, animKey, onClick, zIndex = 1, isFocused = false, position }: FloatingInfoCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const driftActive = useRef(false);
  const driftPhase = useRef(0);

  // Unique drift phase per card — prevents all cards floating in sync
  useEffect(() => {
    driftPhase.current = index * 1.7 + node.position[0] * 0.3 + node.position[1] * 0.5;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outward explosion entrance — cards start displaced toward center and spring outward
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    gsap.killTweensOf(el);
    driftActive.current = false;

    // Displace toward center using 3D position as direction proxy
    const ox = -node.position[0] * 10;
    const oy = node.position[1] * 10;

    gsap.set(el, { opacity: 0, scale: 0.72, x: ox, y: oy });
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      duration: 0.6,
      ease: 'back.out(1.2)',
      delay: index * 0.08,
      onComplete: () => {
        driftActive.current = true;
      },
    });

    return () => {
      gsap.killTweensOf(el);
      driftActive.current = false;
    };
  }, [animKey, index, node.position]);

  // Perpetual micro-drift — synced to R3F clock, matches chess piece float frequency
  // Writes to the inner card div (drei owns the outer Html container)
  useFrame((state) => {
    const el = cardRef.current;
    if (!el || !driftActive.current) return;
    const t = state.clock.elapsedTime;
    const dx = Math.sin(t * 0.5 + driftPhase.current) * 4;
    const dy = Math.cos(t * 0.38 + driftPhase.current + 1.1) * 5;
    el.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  });

  return (
    <group position={position ?? node.position}>
      <Html center={false} occlude={false} style={{ zIndex, pointerEvents: 'none' }}>
        <div
          ref={cardRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            width: '480px',
            background: 'hsla(230, 15%, 7%, 0.95)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: isFocused ? `1px solid ${node.color}99` : `1px solid ${node.color}44`,
            borderTop: isFocused ? `2px solid ${node.color}ff` : `2px solid ${node.color}bb`,
            borderRadius: '10px',
            padding: '16px 18px',
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: 'pointer',
            boxShadow: isFocused
              ? `0 0 48px ${node.color}66, 0 8px 40px rgba(0,0,0,0.8)`
              : `0 2px 20px rgba(0,0,0,0.6), 0 0 0 0.5px ${node.color}22`,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isFocused) {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                `0 0 32px ${node.color}44, 0 8px 40px rgba(0,0,0,0.7)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isFocused) {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                `0 2px 20px rgba(0,0,0,0.6), 0 0 0 0.5px ${node.color}22`;
            }
          }}
        >
          {/* Category badge */}
          <div style={{
            display: 'inline-block',
            fontSize: '8px',
            letterSpacing: '0.09em',
            textTransform: 'uppercase' as const,
            padding: '2px 7px',
            borderRadius: '20px',
            marginBottom: '6px',
            backgroundColor: node.color + '20',
            color: node.color,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
          }}>
            {categoryLabels[node.category]}
          </div>

          {/* Label */}
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'hsl(210, 20%, 95%)',
            marginBottom: '8px',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}>
            {node.label}
          </div>

          {/* Summary — plain English */}
          {node.summary && (
            <div style={{
              fontSize: '11px',
              color: 'hsl(210, 20%, 82%)',
              lineHeight: 1.6,
              marginBottom: '10px',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {node.summary}
            </div>
          )}

          {/* Technical detail block */}
          <div style={{
            marginBottom: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'hsla(230, 15%, 10%, 0.7)',
            borderLeft: `2px solid ${node.color}33`,
          }}>
            <div style={{
              fontSize: '7px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'hsl(215, 12%, 38%)',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '4px',
            }}>
              Technical Detail
            </div>
            <div style={{
              fontSize: '9px',
              color: 'hsl(215, 12%, 52%)',
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.55,
            }}>
              {node.description}
            </div>
          </div>

          {/* Screenshot preview — first image only */}
          {(node.screenshots?.[0] ?? node.screenshot) && (
            <div style={{ marginBottom: '10px' }}>
              <img
                src={node.screenshots?.[0] ?? node.screenshot}
                alt={`${node.label} screenshot`}
                style={{
                  width: '100%',
                  maxHeight: '140px',
                  objectFit: 'cover',
                  borderRadius: '5px',
                  border: `1px solid ${node.color}33`,
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Implementation note */}
          {node.implementationNote && (
            <div style={{
              marginBottom: '10px',
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: node.color + '0e',
              borderLeft: `2px solid ${node.color}55`,
            }}>
              <div style={{
                fontSize: '7px',
                letterSpacing: '0.09em',
                textTransform: 'uppercase' as const,
                color: node.color,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '3px',
                opacity: 0.9,
              }}>
                Under the Hood
              </div>
              <div style={{
                fontSize: '8px',
                color: 'hsl(215, 12%, 48%)',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.55,
                fontStyle: 'italic',
              }}>
                {node.implementationNote}
              </div>
            </div>
          )}

          {/* Tech stack tags — all shown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {node.techStack.map((tech) => (
              <span key={tech} style={{
                fontSize: '7px',
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'hsl(230, 12%, 13%)',
                color: 'hsl(210, 15%, 62%)',
                border: `1px solid hsl(230, 12%, 20%)`,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.02em',
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
};

export default FloatingInfoCard;
