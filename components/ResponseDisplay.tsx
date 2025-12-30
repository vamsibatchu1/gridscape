
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Idea } from '../types';

interface ResponseDisplayProps {
  idea: Idea;
  previousIdea?: Idea;
  onRemove: (id: number) => void;
  onBringToFront: (id: number) => void;
  onRegenerate: (id: number) => void;
  onSwitchVersion: (id: number, index: number) => void;
  onExploreTerm: (term: string, sourceIdea: Idea) => void;
  isActive: boolean;
}

const toRoman = (num: number): string => {
  if (num <= 0) return '0';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let n = num;
  return lookup.reduce((acc, [char, value]) => {
    acc += char.repeat(Math.floor(n / value));
    n %= value;
    return acc;
  }, '');
};

const TerminalLoader: React.FC<{ idea: Idea; previousIdea?: Idea; compact?: boolean }> = ({ idea, previousIdea, compact = false }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logIndex = useRef(0);

  const phases = useMemo(() => {
    if (compact) {
      return [
        "CALIBRATING ASCII GRID...",
        "EXTRACTING VECTORS...",
        "DRAFTING SCHEMATIC...",
        "POLISHING ARTIFACT..."
      ];
    }
    return [
      "SYSTEM_READY: BOOTING NEURAL ENGINE...",
      `LOCATING COORDS: [X:${idea.x.toFixed(0)}, Y:${idea.y.toFixed(0)}]...`,
      previousIdea 
        ? `ANCHORING ORIGIN: "${previousIdea.terms[0] || 'Previous Node'}"...` 
        : "INITIALIZING ROOT NODE...",
      "CALIBRATING SEMANTIC DIMENSIONS...",
      "EXTRACTING MULTI-VECTOR KNOWLEDGE...",
      "MAPPING ASCII SCHEMATIC BLUEPRINTS...",
      "DRAFTING NARRATIVE BRIDGE...",
      "SYNTHESIZING CONCEPTUAL ARTIFACT..."
    ];
  }, [idea.x, idea.y, previousIdea, compact]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logIndex.current < phases.length) {
        setLogs(prev => [...prev, phases[logIndex.current]]);
        logIndex.current++;
      } else if (!compact) {
        const randomNoises = [
          "OPTIMIZING BUFFER...",
          "RE-INDEXING TOKENS...",
          "STABILIZING GRID...",
          "POLISHING PROSE..."
        ];
        setLogs(prev => [...prev, randomNoises[Math.floor(Math.random() * randomNoises.length)]]);
      }
    }, compact ? 800 : 1200);

    return () => clearInterval(interval);
  }, [phases, compact]);

  return (
    <div className={`w-full flex flex-col p-4 bg-black/[0.03] overflow-hidden ${compact ? 'h-24 justify-center py-2' : 'h-full'}`}>
      <div className={`flex items-center gap-2 border-b border-black/5 pb-2 ${compact ? 'mb-1' : 'mb-3'}`}>
        <div className="w-2 h-2 rounded-full bg-black/20 animate-pulse" />
        <span className="font-mono text-[6pt] uppercase tracking-widest text-black/40">
          {compact ? "Schematic Calibration" : "Researcher's Log"}
        </span>
      </div>
      <div className={`flex flex-col gap-1 font-mono text-[5.5pt] sm:text-[6.5pt] leading-tight text-black/60 ${compact ? 'max-h-16 overflow-hidden' : ''}`}>
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
            <span className="text-black/30">></span>
            <span className={i === logs.length - 1 ? "animate-pulse font-bold" : ""}>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ 
  idea, 
  previousIdea,
  onRemove, 
  onBringToFront, 
  onRegenerate,
  onSwitchVersion,
  onExploreTerm,
  isActive 
}) => {
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowTools(false);
    }
  }, [isActive]);

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBringToFront(idea.id);
    
    if (!idea.isLoading && !!idea.text) {
      setShowTools(true);
    }
  };

  const handleCycleVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (idea.versions.length <= 1) return;
    const nextIndex = (idea.currentVersionIndex + 1) % idea.versions.length;
    onSwitchVersion(idea.id, nextIndex);
  };

  const renderedContent = useMemo(() => {
    if (!idea.text || !idea.terms || idea.terms.length === 0) return idea.text;

    const sortedTerms = [...idea.terms].sort((a, b) => b.length - a.length);
    const escapedTerms = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escapedTerms})`, 'gi');

    const parts = idea.text.split(regex);
    return parts.map((part, i) => {
      const isTerm = sortedTerms.some(term => term.toLowerCase() === part.toLowerCase());
      if (isTerm) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onExploreTerm(part, idea);
            }}
            className="cursor-pointer underline decoration-dotted decoration-black/60 underline-offset-4 hover:decoration-black hover:text-black transition-all"
            title={`Explore "${part}"`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [idea.text, idea.terms, idea.id, onExploreTerm]);

  const stackLayers = Math.min(idea.versions.length - 1, 3);

  return (
    <div 
        className="pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
            position: 'absolute',
            left: idea.x,
            top: idea.y,
            width: idea.width,
            height: idea.height,
            zIndex: isActive ? 50 : 10,
        }}
    >
      {Array.from({ length: stackLayers }).map((_, i) => (
        <div 
          key={`layer-${i}`}
          className={`absolute bg-[#FDFDFD] border border-black/30 transition-all duration-300 ${isActive ? 'ring-1 ring-black' : ''}`}
          style={{
            top: (i + 1) * 4,
            left: (i + 1) * 4,
            width: '100%',
            height: '100%',
            zIndex: -(i + 1),
            pointerEvents: 'none',
            opacity: 1 - (i * 0.15)
          }}
        />
      ))}

      <div 
          className={`group relative w-full h-full bg-[#FDFDFD] border border-black/30 hover:border-black transition-all duration-300 pointer-events-auto cursor-pointer ${isActive ? 'ring-1 ring-black shadow-lg' : ''}`}
          onMouseDown={handleBlockClick}
      >
        {showTools && (
          <div 
            className="absolute left-0 -top-12 flex items-center gap-[6px] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 whitespace-nowrap z-[60]"
            style={{ height: '32px' }}
          >
            <div className="h-8 px-3 flex items-center justify-center bg-white border border-black/30 text-black text-[9px] font-mono uppercase tracking-tight shadow-sm select-none whitespace-nowrap">
              #{toRoman(idea.id + 1)}
            </div>

            {idea.versions.length > 0 && (
              <button 
                onClick={handleCycleVersion}
                className={`h-8 px-3 flex items-center gap-2 bg-white border border-black/30 text-black text-[9px] font-mono uppercase tracking-tight shadow-sm select-none hover:bg-black hover:text-white transition-all whitespace-nowrap ${idea.versions.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
                title={idea.versions.length > 1 ? "Cycle Versions" : "Initial Version"}
              >
                <span className="google-symbols text-[14px]">history</span>
                V.{toRoman(idea.currentVersionIndex + 1)} / {toRoman(idea.versions.length)}
              </button>
            )}

            <div className="h-8 px-3 flex items-center justify-center bg-white border border-black/30 text-black text-[9px] font-mono uppercase tracking-tight shadow-sm select-none whitespace-nowrap">
              {idea.text.length.toLocaleString()} CHARS
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onRegenerate(idea.id); }}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white border border-black/30 text-black hover:bg-black hover:text-white transition-all shadow-sm"
              title="Stack New Version"
            >
              <span className="google-symbols text-[18px]">layers</span>
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(idea.id); }}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white border border-black/30 text-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
              title="Remove"
            >
              <span className="google-symbols text-[18px]">close</span>
            </button>
          </div>
        )}

        <div className={`w-full h-full custom-scrollbar ${isActive ? 'overflow-y-auto is-active select-text' : 'overflow-hidden pointer-events-none'}`}>
          {idea.isLoading ? (
            <TerminalLoader idea={idea} previousIdea={previousIdea} />
          ) : idea.error ? (
            <div className="p-3">
              <p className="text-[8px] text-red-600 uppercase tracking-tighter bg-red-50 p-1 border border-red-100">{idea.error}</p>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-4">
              {/* ASCII Art Schematic Header - Displays its own loader if text is ready but art isn't */}
              <div className="bg-black/[0.03] border-b border-black/5 p-2 -mx-3 -mt-3 select-none">
                {idea.isAsciiLoading ? (
                  <TerminalLoader idea={idea} compact />
                ) : idea.asciiArt ? (
                  <>
                    <pre 
                      className="font-mono text-[5pt] sm:text-[6pt] leading-[1.1] text-black/60 overflow-hidden text-center"
                      style={{ letterSpacing: '-0.5px' }}
                    >
                      {idea.asciiArt}
                    </pre>
                    <div className="mt-1 border-t border-black/10 pt-1 text-[5px] font-mono text-black/30 uppercase tracking-[0.2em] text-center">
                      Conceptual Schematic v.01
                    </div>
                  </>
                ) : null}
              </div>

              <div 
                className="font-garamond text-[7pt] sm:text-[9pt] leading-[1.3] text-justify text-black whitespace-pre-wrap"
                style={{ 
                  margin: 0, 
                  textAlign: 'justify',
                  textJustify: 'inter-character'
                }}
              >
                {renderedContent}
              </div>
            </div>
          )}
        </div>
        
        {!isActive && idea.versions.length > 1 && (
          <div className="absolute bottom-1 right-1 px-1 bg-black text-white text-[6px] font-mono pointer-events-none whitespace-nowrap shadow-sm">
            STACK: {toRoman(idea.versions.length)}
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
          }
          .custom-scrollbar.is-active:hover::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.4);
          }
          .google-symbols {
            font-variation-settings: 'wght' 300 !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ResponseDisplay;
