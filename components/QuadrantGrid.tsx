
import React, { useRef, useState, useEffect } from 'react';
import type { Point, Rect } from '../types';

interface SelectionData {
  rect: Rect;
}

interface QuadrantGridProps {
  onRectSelect: (data: SelectionData) => void;
  panOffset: Point;
  onPan: (offset: Point | ((prev: Point) => Point)) => void;
  onZoom: (delta: number, center: Point) => void;
  zoom: number;
  isOverlap: (rect: Rect) => boolean;
  isAutoPanning?: boolean;
  showHints?: boolean;
  children?: React.ReactNode;
}

const QuadrantGrid: React.FC<QuadrantGridProps> = ({ 
  onRectSelect, 
  panOffset, 
  onPan, 
  onZoom,
  zoom,
  isOverlap, 
  isAutoPanning = false,
  showHints = false,
  children 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const [hasDrawnOnce, setHasDrawnOnce] = useState(false);

  // Wheel handling for panning and zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const scrollable = target.closest('.custom-scrollbar');
      const isScrollableActive = scrollable?.classList.contains('is-active');

      if (isScrollableActive) {
        const el = scrollable as HTMLElement;
        const isAtTop = el.scrollTop <= 0;
        const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
        
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          if (e.deltaY < 0 && !isAtTop) return; 
          if (e.deltaY > 0 && !isAtBottom) return;
        }
      }

      e.preventDefault();

      if (e.ctrlKey) {
        // Handle Zoom (Pinch on trackpad or Ctrl + Scroll)
        const zoomSpeed = 0.01;
        const delta = -e.deltaY * zoomSpeed;
        onZoom(delta, { x: e.clientX, y: e.clientY });
      } else {
        // Handle Pan
        onPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onPan, onZoom]);

  const screenToWorld = (clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Accounting for zoom: World coordinate is screen space minus pan, divided by scale.
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === e.currentTarget) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setStartPos(worldPos);
      setCurrentPos(worldPos);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setHoverPos(worldPos);
    // Hints should only show when mouse is directly over the grid container
    setIsOverCanvas(e.target === e.currentTarget);
    if (isDrawing) {
      setCurrentPos(worldPos);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && startPos && currentPos) {
      const rect: Rect = {
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      };

      if (rect.width > 20 && rect.height > 20) {
        onRectSelect({ rect });
        setHasDrawnOnce(true);
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  const selectionRect = isDrawing && startPos && currentPos ? {
    x: Math.min(startPos.x, currentPos.x),
    y: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  } : null;

  // Ghost frame constants (world space)
  const GHOST_WIDTH = 120;
  const GHOST_HEIGHT = 90;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 select-none overflow-hidden touch-none ${showHints ? 'cursor-crosshair' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setHoverPos(null);
        setIsOverCanvas(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        className={`absolute inset-0 pointer-events-none ${isAutoPanning ? 'transition-transform duration-700 ease-in-out' : ''}`}
        style={{ 
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {children}
      </div>

      {/* Ghost Frame Hint & Tooltip - Only shown if showHints is true AND over empty space */}
      {showHints && isOverCanvas && !isDrawing && !hasDrawnOnce && hoverPos && (
        <div 
          className="absolute pointer-events-none z-40 flex flex-col items-start gap-2"
          style={{
            left: hoverPos.x * zoom + panOffset.x,
            top: hoverPos.y * zoom + panOffset.y,
          }}
        >
          <div 
            className="border border-dashed border-black/15 bg-black/[0.02]"
            style={{
              width: GHOST_WIDTH * zoom,
              height: GHOST_HEIGHT * zoom,
              marginLeft: 8,
              marginTop: 8
            }}
          />
          <div className="font-ibm-plex text-[6pt] uppercase tracking-widest text-black/40 ml-2">
            Draw to explore
          </div>
        </div>
      )}

      {selectionRect && (
        <div 
            className="absolute border-2 border-dashed border-black bg-black/5 pointer-events-none z-50"
            style={{
                left: selectionRect.x * zoom + panOffset.x,
                top: selectionRect.y * zoom + panOffset.y,
                width: selectionRect.width * zoom,
                height: selectionRect.height * zoom,
            }}
        />
      )}
    </div>
  );
};

export default QuadrantGrid;
