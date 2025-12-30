import React from 'react';
import { motion } from 'framer-motion';
import type { Idea, Suggestion } from '../types';

interface SuggestionConnectorProps {
  source: Idea;
  target: Suggestion;
}

const SuggestionConnector: React.FC<SuggestionConnectorProps> = ({ source, target }) => {
  const startX = source.x + source.width;
  const startY = source.y + source.height / 2;
  const endX = target.x - 1; // Centered on the dot which is -left-1
  const endY = target.y + target.height / 2;

  // Cubic Bezier curve
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  return (
    <g className="pointer-events-none">
      <path
        d={path}
        fill="none"
        stroke="#000"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.2"
        style={{
          animation: 'suggestion-flow 2s linear infinite'
        }}
      />
      <circle cx={startX} cy={startY} r="1.5" fill="#000" opacity="0.3" />
      <circle cx={endX} cy={endY} r="1.5" fill="#000" opacity="0.3" />

      <style>{`
        @keyframes suggestion-flow {
          from { stroke-dashoffset: 16; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </g>
  );
};

export default SuggestionConnector;