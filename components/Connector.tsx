
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Idea } from '../types';

interface ConnectorProps {
  source: Idea;
  target: Idea;
}

const Connector: React.FC<ConnectorProps> = ({ source, target }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getMidpoints = (rect: Idea) => [
    { x: rect.x + rect.width / 2, y: rect.y, dir: 'v' }, // Top
    { x: rect.x + rect.width / 2, y: rect.y + rect.height, dir: 'v' }, // Bottom
    { x: rect.x, y: rect.y + rect.height / 2, dir: 'h' }, // Left
    { x: rect.x + rect.width, y: rect.y + rect.height / 2, dir: 'h' }, // Right
  ];

  const sourceMidpoints = getMidpoints(source);
  const targetMidpoints = getMidpoints(target);

  let bestSource = sourceMidpoints[0];
  let bestTarget = targetMidpoints[0];
  let minDist = Infinity;

  for (const sP of sourceMidpoints) {
    for (const tP of targetMidpoints) {
      const dist = Math.pow(sP.x - tP.x, 2) + Math.pow(sP.y - tP.y, 2);
      if (dist < minDist) {
        minDist = dist;
        bestSource = sP;
        bestTarget = tP;
      }
    }
  }

  const offset = Math.min(Math.abs(bestSource.x - bestTarget.x), Math.abs(bestSource.y - bestTarget.y), 50) + 20;
  
  const cp1 = { ...bestSource };
  const cp2 = { ...bestTarget };

  if (bestSource.dir === 'v') {
    cp1.y += (bestTarget.y > bestSource.y ? offset : -offset);
  } else {
    cp1.x += (bestTarget.x > bestSource.x ? offset : -offset);
  }

  if (bestTarget.dir === 'v') {
    cp2.y += (bestSource.y > bestTarget.y ? offset : -offset);
  } else {
    cp2.x += (bestSource.x > bestTarget.x ? offset : -offset);
  }

  const pathData = `M ${bestSource.x} ${bestSource.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${bestTarget.x} ${bestTarget.y}`;

  const handleMouseMove = (e: React.MouseEvent<SVGGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setMousePos({ x: cursor.x, y: cursor.y });
  };

  const tooltipDestination = typeof document !== 'undefined' ? document.getElementById('connector-tooltip-layer') : null;

  return (
    <g 
      className="pointer-events-auto cursor-crosshair"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={{ isolation: 'isolate' }}
    >
      {/* Invisible thicker path for easier hovering */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
      />
      
      {/* Visual Path (Dashed Line) */}
      <path
        d={pathData}
        fill="none"
        stroke="#000"
        strokeWidth={isHovered ? "2" : "1.5"}
        strokeDasharray="4 4"
        opacity={isHovered ? "0.6" : "0.3"}
        className="transition-all duration-300"
        style={{
            animation: isHovered ? 'none' : 'pulse 1.5s linear infinite',
        }}
      />
      
      {/* Endpoints */}
      <circle cx={bestSource.x} cy={bestSource.y} r={isHovered ? "4" : "3.5"} fill="#000" opacity={isHovered ? "0.8" : "0.5"} className="transition-all duration-300" />
      <circle cx={bestTarget.x} cy={bestTarget.y} r={isHovered ? "4" : "3.5"} fill="#000" opacity={isHovered ? "0.8" : "0.5"} className="transition-all duration-300" />

      {/* Glassine Lens Bridge Text - Portaled to a higher layer */}
      {isHovered && target.bridgeText && tooltipDestination && createPortal(
        <div 
          className="absolute pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: 'translate(-50%, -100%) translateY(-20px)',
            width: '220px',
            zIndex: 1000
          }}
        >
          <div className="flex justify-center items-center h-full animate-in fade-in zoom-in-95 duration-200">
            <div 
              className="px-4 py-2 rounded-full border-[0.5px] border-black shadow-xl backdrop-blur-md bg-white/40 flex items-center justify-center max-w-full"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              }}
            >
              <p className="font-garamond italic text-[8.5pt] text-black text-center leading-tight whitespace-normal break-words px-1">
                {target.bridgeText}
              </p>
            </div>
          </div>
        </div>,
        tooltipDestination
      )}

      <style>{`
        @keyframes pulse {
          from { stroke-dashoffset: 16; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </g>
  );
};

export default Connector;
