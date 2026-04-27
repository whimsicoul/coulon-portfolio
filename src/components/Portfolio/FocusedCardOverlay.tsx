import { createPortal } from 'react-dom';
import type { ComponentNode } from '@/data/projectData';
import { useIsMobile } from '@/hooks/use-mobile';

interface FocusedCardOverlayProps {
  node: ComponentNode;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  core: 'Core',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  feature: 'Feature',
};

const FocusedCardOverlay = ({ node, onClose }: FocusedCardOverlayProps) => {
  const isMobile = useIsMobile();
  const hasScreenshots = !!(node.screenshots?.length || node.screenshot);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'backdropIn 0.25s ease both',
        padding: isMobile ? '8px' : '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '1200px',
          height: isMobile ? '100dvh' : 'calc(100vh - 48px)',
          minHeight: isMobile ? '100vh' : undefined,
          display: 'flex',
          flexDirection: 'column',
          background: 'hsla(230, 15%, 7%, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${node.color}55`,
          borderTop: `3px solid ${node.color}`,
          borderRadius: isMobile ? '0px' : '14px',
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: `0 0 80px ${node.color}25, 0 32px 80px rgba(0,0,0,0.8)`,
          animation: 'cardFocusIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 14px' : '20px 28px',
          borderBottom: `1px solid ${node.color}22`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              fontSize: '11px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: node.color + '20',
              color: node.color,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {categoryLabels[node.category]}
            </div>
            <div style={{
              fontSize: isMobile ? '18px' : '26px',
              fontWeight: 700,
              color: 'hsl(210, 20%, 95%)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {node.label}
            </div>
          </div>
          <div
            onClick={onClose}
            style={{
              fontSize: isMobile ? '16px' : '11px',
              letterSpacing: isMobile ? '0' : '0.08em',
              color: 'hsl(215, 12%, 40%)',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              userSelect: 'none',
              padding: isMobile ? '8px 12px' : '6px 12px',
              border: '1px solid hsl(215, 12%, 22%)',
              borderRadius: '6px',
              flexShrink: 0,
              marginLeft: '8px',
            }}
          >
            {isMobile ? '✕' : 'ESC / click outside'}
          </div>
        </div>

        {/* Body — two columns on desktop, single column on mobile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: (!isMobile && hasScreenshots) ? '1fr 1fr' : '1fr',
          flex: 1,
          minHeight: 0,
          overflowY: isMobile ? 'auto' : undefined,
        }}>
          {/* Left: text content */}
          <div style={{
            padding: isMobile ? '14px 16px' : '32px 36px',
            overflowY: isMobile ? undefined : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            borderRight: (!isMobile && hasScreenshots) ? `1px solid ${node.color}15` : undefined,
          }}>
            {/* Summary */}
            {node.summary && (
              <div style={{
                fontSize: isMobile ? '14px' : '18px',
                color: 'hsl(210, 20%, 88%)',
                lineHeight: 1.7,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {node.summary}
              </div>
            )}

            {/* Technical detail */}
            <div style={{
              padding: '18px 20px',
              borderRadius: '10px',
              backgroundColor: 'hsla(230, 15%, 10%, 0.8)',
              borderLeft: `3px solid ${node.color}55`,
            }}>
              <div style={{
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'hsl(215, 12%, 38%)',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '10px',
              }}>
                Technical Detail
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '15px',
                color: 'hsl(215, 12%, 68%)',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.7,
              }}>
                {node.description}
              </div>
            </div>

            {/* Implementation note */}
            {node.implementationNote && (
              <div style={{
                padding: '18px 20px',
                borderRadius: '10px',
                backgroundColor: node.color + '0e',
                borderLeft: `3px solid ${node.color}55`,
              }}>
                <div style={{
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: node.color,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: '10px',
                  opacity: 0.9,
                }}>
                  Under the Hood
                </div>
                <div style={{
                  fontSize: isMobile ? '12px' : '15px',
                  color: 'hsl(215, 12%, 64%)',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}>
                  {node.implementationNote}
                </div>
              </div>
            )}

            {/* Tech stack */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
              {node.techStack.map((tech) => (
                <span key={tech} style={{
                  fontSize: isMobile ? '11px' : '13px',
                  padding: isMobile ? '4px 8px' : '5px 14px',
                  borderRadius: '6px',
                  background: 'hsl(230, 12%, 13%)',
                  color: 'hsl(210, 15%, 65%)',
                  border: `1px solid hsl(230, 12%, 22%)`,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.02em',
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Screenshots — below text on mobile, right column on desktop */}
          {hasScreenshots && (
            <div style={{
              padding: isMobile ? '0 16px 16px' : '32px 36px',
              overflowY: isMobile ? undefined : 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              justifyContent: node.screenshots && node.screenshots.length > 1 ? 'flex-start' : 'center',
            }}>
              {(node.screenshots ?? (node.screenshot ? [node.screenshot] : [])).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${node.label} screenshot ${i + 1}`}
                  style={{
                    width: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: `1px solid ${node.color}33`,
                    display: 'block',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FocusedCardOverlay;
