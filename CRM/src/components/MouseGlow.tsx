import { useState, useCallback, type ReactNode } from 'react';

export interface MouseGlowProps {
  children: ReactNode;
  className?: string;
}


export function MouseGlow({ children, className = '' }: MouseGlowProps) {
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouse(null);
  }, []);

  return (
    <div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {mouse && (
        <div
          className="landing-v2-bg-glow"
          aria-hidden
          style={{
            left: mouse.x,
            top: mouse.y,
          }}
        />
      )}
      {children}
    </div>
  );
}
