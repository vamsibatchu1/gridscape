import React from 'react';
import { motion } from 'framer-motion';
import type { Suggestion } from '../types';

interface SuggestionNodeProps {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
}

const SuggestionNode: React.FC<SuggestionNodeProps> = ({ suggestion, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 5 }}
      className="pointer-events-auto cursor-pointer group"
      style={{
        position: 'absolute',
        left: suggestion.x,
        top: suggestion.y,
        height: 32, // Fixed height as requested
        zIndex: 5,
        width: 'max-content', // Width fits content
      }}
      onClick={() => onClick(suggestion)}
    >
      <div className="h-full bg-[#FDFDFD]/90 backdrop-blur-sm border border-black/20 group-hover:border-black/60 group-hover:bg-white transition-all duration-300 px-5 flex items-center justify-center shadow-sm group-hover:shadow-md py-0">
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black/40 group-hover:bg-black transition-colors" />
        <p className="font-ibm-plex text-[6.5pt] sm:text-[7.5pt] text-black/70 group-hover:text-black leading-none whitespace-nowrap">
          {suggestion.text}
        </p>
      </div>
    </motion.div>
  );
};

export default SuggestionNode;