import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuadrantGrid from './components/QuadrantGrid';
import ResponseDisplay from './components/ResponseDisplay';
import Connector from './components/Connector';
import SuggestionNode from './components/SuggestionNode';
import SuggestionConnector from './components/SuggestionConnector';
import { getQuadrantMainContent, getQuadrantAsciiArt, getPointForConcept, getSuggestions } from './services/geminiService';
import type { Point, QuadrantLabels, Idea, Rect, IdeaVersion, Suggestion } from './types';

const GRID_GAP = 24;
const TOOLBAR_HEIGHT = 60; 

const MAGIC_TOPICS = [
  "The Architecture of Silence",
  "Biological Mimicry in Urban Planning",
  "The Philosophy of Lost Time",
  "Quantum Entanglement in Poetry",
  "The Geometry of Empathy",
  "Digital Archeology of the 21st Century",
  "The Thermodynamics of Social Movements",
  "Neuroplasticity of Musical Memory",
  "The Semiotics of Empty Spaces",
  "Algorithmic Fairness in Folklore"
];

const PLACEHOLDER_TOPICS = [
  "Dinosaurs",
  "Artificial Intelligence",
  "Game of Thrones",
  "Cristiano Ronaldo",
  "Quantum Entanglement",
  "Renaissance Art",
  "The History of Coffee",
  "Martian Colonization"
];

const BrandHeader = ({ isLanding }: { isLanding: boolean }) => (
  <div className={`flex flex-col gap-1 transition-all duration-300 ${isLanding ? 'items-center' : 'items-start'}`}>
      <motion.h1 
        initial={isLanding ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className={`font-garamond tracking-tight text-black select-none ${isLanding ? 'text-[48pt] sm:text-[64pt]' : 'text-[24pt] sm:text-[32pt]'}`}
      >
          Gridscape
      </motion.h1>
      <motion.div 
        initial={isLanding ? { opacity: 0 } : false}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="pointer-events-none mt-[-4px]"
      >
           <p className={`${isLanding ? 'text-[16pt]' : 'text-[7pt]'} font-garamond leading-tight uppercase tracking-widest text-black`}>
                BY <a href="https://x.com/vamsibatchuk" target="_blank" rel="noopener noreferrer" className="hover:underline pointer-events-auto">VAMSI BATCHU</a>
            </p>
      </motion.div>
  </div>
);

const App: React.FC = () => {
  const [labels] = useState<QuadrantLabels>({
    top: 'Abstract',
    bottom: 'Concrete',
    left: 'Simple',
    right: 'Complex',
  });
  const [context, setContext] = useState<string>('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeIdeaId, setActiveIdeaId] = useState<number | null>(null);
  const [activeSuggestions, setActiveSuggestions] = useState<Suggestion[]>([]);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isAddingConcept, setIsAddingConcept] = useState(false);
  const [newConceptTitle, setNewConceptTitle] = useState('');
  const [isAutoPanning, setIsAutoPanning] = useState(false);
  
  const [showInitialInput, setShowInitialInput] = useState(true);
  const [initialTopicInput, setInitialTopicInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [placeholderText, setPlaceholderText] = useState('');
  const [topicIndex, setTopicIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  // Stats State
  const [totalCharsGenerated, setTotalCharsGenerated] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeStatIndex, setActiveStatIndex] = useState(0);

  useEffect(() => {
    if (showInitialInput) {
      const startTimeout = setTimeout(() => {
        setAnimationEnabled(true);
      }, 2500);
      return () => clearTimeout(startTimeout);
    }
  }, [showInitialInput]);

  useEffect(() => {
    if (isInputFocused || !showInitialInput || !animationEnabled) return;

    const currentFullText = PLACEHOLDER_TOPICS[topicIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      if (placeholderText === '') {
        setIsDeleting(false);
        setTopicIndex((prev) => (prev + 1) % PLACEHOLDER_TOPICS.length);
        timeout = setTimeout(() => {}, 500);
      } else {
        timeout = setTimeout(() => {
          setPlaceholderText(currentFullText.substring(0, placeholderText.length - 1));
        }, 50);
      }
    } else {
      if (placeholderText === currentFullText) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else {
        timeout = setTimeout(() => {
          setPlaceholderText(currentFullText.substring(0, placeholderText.length + 1));
        }, 100);
      }
    }

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, topicIndex, isInputFocused, showInitialInput, animationEnabled]);

  // Session timer update
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Stat rotation logic
  useEffect(() => {
    if (showInitialInput) return;
    const interval = setInterval(() => {
      setActiveStatIndex(prev => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, [showInitialInput]);

  const ideaIdCounter = useRef(0);

  const sortedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => a.id - b.id);
  }, [ideas]);

  const centerOnRect = useCallback((rect: Rect) => {
    setIsAutoPanning(true);
    setPanOffset({
      x: window.innerWidth / 2 - (rect.x + rect.width / 2) * zoom,
      y: window.innerHeight / 2 - (rect.y + rect.height / 2) * zoom,
    });
    setTimeout(() => {
      setIsAutoPanning(false);
    }, 700);
  }, [zoom]);

  const isOverlap = useCallback((newRect: Rect, gap: number = GRID_GAP): boolean => {
    return ideas.some(idea => {
      return !(
        newRect.x + newRect.width + gap <= idea.x ||
        newRect.x >= idea.x + idea.width + gap ||
        newRect.y + newRect.height + gap <= idea.y ||
        newRect.y >= idea.y + idea.height + gap
      );
    });
  }, [ideas]);

  const findValidSpot = useCallback((rect: Rect): Rect => {
    if (!isOverlap(rect)) return rect;

    const step = 20;
    const maxRings = 40;

    for (let r = 1; r <= maxRings; r++) {
      for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
          if (Math.abs(x) !== r && Math.abs(y) !== r) continue;
          const testRect = { ...rect, x: rect.x + x * step, y: rect.y + y * step };
          if (!isOverlap(testRect)) return testRect;
        }
      }
    }
    return rect;
  }, [isOverlap, ideas]);

  const generateContentForIdea = useCallback(async (id: number, rect: Rect, currentContext: string) => {
    const currentIdeas = await new Promise<Idea[]>(resolve => {
        setIdeas(prev => {
            resolve(prev);
            return prev;
        });
    });

    const history = [...currentIdeas]
      .filter(i => i.id !== id && !!i.text)
      .sort((a, b) => a.id - b.id)
      .map(i => i.text);

    setIdeas(prev => prev.map(i => i.id === id ? { ...i, isLoading: true, isAsciiLoading: true, error: null } : i));
    setActiveSuggestions([]);

    const aiPoint: Point = {
      x: Math.max(-1, Math.min(1, rect.x / 1000)),
      y: Math.max(-1, Math.min(1, -rect.y / 1000)),
    };

    try {
      const data = await getQuadrantMainContent(labels, aiPoint, currentContext, history);
      setTotalCharsGenerated(prev => prev + data.text.length);
      
      setIdeas(prev => prev.map(i => {
        if (i.id === id) {
          const newVersion: IdeaVersion = { 
            text: data.text, 
            bridgeText: data.bridge || undefined, 
            terms: data.terms 
          };
          const updatedVersions = [...i.versions, newVersion];
          return { 
            ...i, 
            text: data.text, 
            bridgeText: data.bridge || undefined, 
            terms: data.terms,
            versions: updatedVersions,
            currentVersionIndex: updatedVersions.length - 1,
            isLoading: false 
          };
        }
        return i;
      }));

      // Fetch branching suggestions
      const suggestedPaths = await getSuggestions(currentContext, data.text);
      if (suggestedPaths.length > 0) {
        const SUGG_HEIGHT = 32;
        const SUGG_GAP = 12;
        const totalHeight = (SUGG_HEIGHT * 3) + (SUGG_GAP * 2);
        const startY = rect.y + rect.height / 2 - totalHeight / 2;

        const suggs: Suggestion[] = suggestedPaths.map((text, idx) => ({
          id: `sugg-${id}-${idx}`,
          sourceId: id,
          text,
          x: rect.x + rect.width + 100,
          y: startY + idx * (SUGG_HEIGHT + SUGG_GAP),
          width: 0, // Handled by CSS w-max
          height: SUGG_HEIGHT
        }));
        setActiveSuggestions(suggs);
      }

      const ascii = await getQuadrantAsciiArt(currentContext, data.text);
      setIdeas(prev => prev.map(i => {
        if (i.id === id) {
          const updatedVersions = [...i.versions];
          if (updatedVersions[i.currentVersionIndex]) {
            updatedVersions[i.currentVersionIndex] = { ...updatedVersions[i.currentVersionIndex], asciiArt: ascii };
          }
          return { 
            ...i, 
            asciiArt: ascii,
            versions: updatedVersions,
            isAsciiLoading: false 
          };
        }
        return i;
      }));

    } catch (err: any) {
      const errorMessage = (err as Error).message || 'An error occurred.';
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, error: errorMessage, isLoading: false, isAsciiLoading: false } : i));
    }
  }, [labels]);

  const handleSuggestionClick = useCallback(async (suggestion: Suggestion) => {
    const sourceNode = ideas.find(i => i.id === suggestion.sourceId);
    if (!sourceNode) return;

    // Immediately hide suggestions to prevent visual overlap
    setActiveSuggestions([]);

    const newIdeaId = ideaIdCounter.current++;
    const widthMultiplier = 0.8 + Math.random() * 0.4;
    const heightMultiplier = 0.8 + Math.random() * 0.4;
    
    const newWidth = Math.max(250, Math.min(450, sourceNode.width * widthMultiplier));
    const newHeight = Math.max(180, Math.min(350, sourceNode.height * heightMultiplier));

    // Place at a 45 degree angle (top-right or bottom-right) from the suggestion
    const distance = 350;
    const isUp = Math.random() > 0.5;
    const angle = isUp ? -Math.PI / 4 : Math.PI / 4;
    const dx = distance * Math.cos(angle);
    const dy = distance * Math.sin(angle);

    const rawRect: Rect = { 
      x: suggestion.x + dx, 
      y: suggestion.y + (suggestion.height / 2) + dy - (newHeight / 2), 
      width: newWidth, 
      height: newHeight 
    };
    
    const snappedRect = findValidSpot(rawRect);

    const tempIdea: Idea = {
        id: newIdeaId, 
        ...snappedRect, 
        text: '', 
        terms: [],
        versions: [],
        currentVersionIndex: -1,
        isLoading: true, 
        isAsciiLoading: true,
        error: null, 
        isCollapsed: false,
    };
    setIdeas(prev => [...prev, tempIdea]);
    setActiveIdeaId(newIdeaId);
    centerOnRect(snappedRect);
    
    try {
        const currentHistory = [...ideas]
          .filter(i => !!i.text)
          .sort((a, b) => a.id - b.id)
          .map(i => i.text);
          
        const point = await getPointForConcept(suggestion.text);
        const data = await getQuadrantMainContent(labels, point, suggestion.text, currentHistory);
        setTotalCharsGenerated(prev => prev + data.text.length);

        setIdeas(prev => prev.map(i => {
          if (i.id === newIdeaId) {
              const newVer: IdeaVersion = { 
                text: data.text, 
                bridgeText: data.bridge || undefined, 
                terms: data.terms 
              };
              const updatedVers = [...i.versions, newVer];
              return { 
                  ...i, 
                  text: data.text, 
                  bridgeText: data.bridge || undefined, 
                  terms: data.terms,
                  versions: updatedVers,
                  currentVersionIndex: updatedVers.length - 1,
                  isLoading: false 
              };
          }
          return i;
        }));

        const suggestedPaths = await getSuggestions(suggestion.text, data.text);
        if (suggestedPaths.length > 0) {
          const SUGG_HEIGHT = 32;
          const SUGG_GAP = 12;
          const totalHeight = (SUGG_HEIGHT * 3) + (SUGG_GAP * 2);
          const startY = snappedRect.y + snappedRect.height / 2 - totalHeight / 2;

          const suggs: Suggestion[] = suggestedPaths.map((text, idx) => ({
            id: `sugg-${newIdeaId}-${idx}`,
            sourceId: newIdeaId,
            text,
            x: snappedRect.x + snappedRect.width + 100,
            y: startY + idx * (SUGG_HEIGHT + SUGG_GAP),
            width: 0,
            height: SUGG_HEIGHT
          }));
          setActiveSuggestions(suggs);
        }

        const ascii = await getQuadrantAsciiArt(suggestion.text, data.text);
        setIdeas(prev => prev.map(i => {
          if (i.id === newIdeaId) {
              const updatedVers = [...i.versions];
              if (updatedVers[i.currentVersionIndex]) {
                updatedVers[i.currentVersionIndex] = { ...updatedVers[i.currentVersionIndex], asciiArt: ascii };
              }
              return { 
                  ...i, 
                  asciiArt: ascii,
                  versions: updatedVers,
                  isAsciiLoading: false 
              };
          }
          return i;
        }));

    } catch (err) {
        const errorMessage = (err as Error).message || 'Failed to place concept.';
        setIdeas(prev => prev.map(i => i.id === newIdeaId ? { ...i, error: errorMessage, isLoading: false, isAsciiLoading: false } : i));
    }
  }, [ideas, labels, findValidSpot, centerOnRect]);

  const handleRectSelect = useCallback(async (data: { rect: Rect }) => {
    const snappedRect = findValidSpot(data.rect);
    const newIdeaId = ideaIdCounter.current++;
    
    const newIdea: Idea = {
        id: newIdeaId, 
        ...snappedRect, 
        text: '', 
        terms: [],
        versions: [],
        currentVersionIndex: -1,
        isLoading: true, 
        isAsciiLoading: true,
        error: null, 
        isCollapsed: false,
    };
    setIdeas(prev => [...prev, newIdea]);
    centerOnRect(snappedRect);
    await generateContentForIdea(newIdeaId, snappedRect, context || 'Ideas');
  }, [context, findValidSpot, generateContentForIdea, centerOnRect]);

  const handleExploreTerm = useCallback(async (term: string, sourceIdea: Idea) => {
    const newIdeaId = ideaIdCounter.current++;
    
    const widthMultiplier = 0.6 + Math.random() * 0.8;
    const heightMultiplier = 0.6 + Math.random() * 0.8;
    
    const newWidth = Math.max(200, Math.min(500, sourceIdea.width * widthMultiplier));
    const newHeight = Math.max(150, Math.min(400, sourceIdea.height * heightMultiplier));

    const rawRect: Rect = { 
      x: sourceIdea.x + sourceIdea.width + 60, 
      y: sourceIdea.y + (Math.random() * 100 - 50), 
      width: newWidth, 
      height: newHeight 
    };
    
    const snappedRect = findValidSpot(rawRect);

    const tempIdea: Idea = {
        id: newIdeaId, 
        ...snappedRect, 
        text: '', 
        terms: [],
        versions: [],
        currentVersionIndex: -1,
        isLoading: true, 
        isAsciiLoading: true,
        error: null, 
        isCollapsed: false,
    };
    setIdeas(prev => [...prev, tempIdea]);
    setActiveIdeaId(newIdeaId);
    centerOnRect(snappedRect);
    
    try {
        const currentHistory = [...ideas]
          .filter(i => !!i.text)
          .sort((a, b) => a.id - b.id)
          .map(i => i.text);
          
        const point = await getPointForConcept(term);
        const data = await getQuadrantMainContent(labels, point, term, currentHistory);
        setTotalCharsGenerated(prev => prev + data.text.length);

        setIdeas(prev => prev.map(i => {
          if (i.id === newIdeaId) {
              const newVer: IdeaVersion = { 
                text: data.text, 
                bridgeText: data.bridge || undefined, 
                terms: data.terms 
              };
              const updatedVers = [...i.versions, newVer];
              return { 
                  ...i, 
                  text: data.text, 
                  bridgeText: data.bridge || undefined, 
                  terms: data.terms,
                  versions: updatedVers,
                  currentVersionIndex: updatedVers.length - 1,
                  isLoading: false 
              };
          }
          return i;
        }));

        const suggestedPaths = await getSuggestions(term, data.text);
        if (suggestedPaths.length > 0) {
          const SUGG_HEIGHT = 32;
          const SUGG_GAP = 12;
          const totalHeight = (SUGG_HEIGHT * 3) + (SUGG_GAP * 2);
          const startY = snappedRect.y + snappedRect.height / 2 - totalHeight / 2;

          const suggs: Suggestion[] = suggestedPaths.map((text, idx) => ({
            id: `sugg-${newIdeaId}-${idx}`,
            sourceId: newIdeaId,
            text,
            x: snappedRect.x + snappedRect.width + 100,
            y: startY + idx * (SUGG_HEIGHT + SUGG_GAP),
            width: 0,
            height: SUGG_HEIGHT
          }));
          setActiveSuggestions(suggs);
        }

        const ascii = await getQuadrantAsciiArt(term, data.text);
        setIdeas(prev => prev.map(i => {
          if (i.id === newIdeaId) {
              const updatedVers = [...i.versions];
              if (updatedVers[i.currentVersionIndex]) {
                updatedVers[i.currentVersionIndex] = { ...updatedVers[i.currentVersionIndex], asciiArt: ascii };
              }
              return { 
                  ...i, 
                  asciiArt: ascii,
                  versions: updatedVers,
                  isAsciiLoading: false 
              };
          }
          return i;
        }));

    } catch (err) {
        const errorMessage = (err as Error).message || 'Failed to place concept.';
        setIdeas(prev => prev.map(i => i.id === newIdeaId ? { ...i, error: errorMessage, isLoading: false, isAsciiLoading: false } : i));
    }
  }, [ideas, labels, findValidSpot, centerOnRect]);

  const handleRegenerate = useCallback(async (id: number) => {
      const idea = ideas.find(i => i.id === id);
      if (idea) {
          await generateContentForIdea(id, idea, context || 'Ideas');
      }
  }, [ideas, context, generateContentForIdea]);

  const handleSwitchVersion = useCallback((id: number, index: number) => {
    setIdeas(prev => prev.map(i => {
      if (i.id === id && i.versions[index]) {
        return {
          ...i,
          currentVersionIndex: index,
          text: i.versions[index].text,
          asciiArt: i.versions[index].asciiArt,
          bridgeText: i.versions[index].bridgeText,
          terms: i.versions[index].terms || []
        };
      }
      return i;
    }));
  }, []);

  const handleRemoveIdea = (idToRemove: number) => {
      setIdeas(prev => {
        const remaining = prev.filter(idea => idea.id !== idToRemove);
        if (remaining.length === 0) {
            setShowInitialInput(true);
            setSessionStartTime(null);
            setTotalCharsGenerated(0);
        }
        return remaining;
      });
      if (activeIdeaId === idToRemove) setActiveIdeaId(null);
      setActiveSuggestions(prev => prev.filter(s => s.sourceId !== idToRemove));
  };

  const handleBringToFront = (id: number) => {
      setActiveIdeaId(id);
      
      setIdeas(prev => {
          const activeNode = prev.find(n => n.id === id);
          if (!activeNode) return prev;

          const toolbarRect: Rect = {
              x: activeNode.x - 20,
              y: activeNode.y - TOOLBAR_HEIGHT - 10,
              width: activeNode.width + 40,
              height: TOOLBAR_HEIGHT + 10
          };

          return prev.map(node => {
              if (node.id === id) return node;

              const isOverlapping = !(
                  node.x + node.width < toolbarRect.x ||
                  node.x > toolbarRect.x + toolbarRect.width ||
                  node.y + node.height < toolbarRect.y ||
                  node.y > toolbarRect.y + toolbarRect.height
              );

              if (isOverlapping) {
                  const dyCenter = (node.y + node.height / 2) - (toolbarRect.y + toolbarRect.height / 2);
                  const dxCenter = (node.x + node.width / 2) - (toolbarRect.x + toolbarRect.width / 2);

                  if (Math.abs(dyCenter) > Math.abs(dxCenter) || node.y + node.height > toolbarRect.y) {
                      const pushY = (toolbarRect.y - (node.y + node.height)) - 10;
                      return { ...node, y: node.y + pushY };
                  } else {
                      const pushX = dxCenter > 0 
                        ? (toolbarRect.x + toolbarRect.width - node.x) + 15
                        : (toolbarRect.x - (node.x + node.width)) - 15;
                      return { ...node, x: node.x + pushX };
                  }
              }
              return node;
          });
      });
  };

  const handlePan = useCallback((offset: Point | ((prev: Point) => Point)) => {
    setPanOffset(offset);
  }, []);

  const handleZoom = useCallback((delta: number, center: Point) => {
    setZoom(prevZoom => {
      const nextZoom = Math.min(Math.max(prevZoom + delta, 0.3), 2.0);
      if (nextZoom === prevZoom) return prevZoom;

      setPanOffset(prevPan => ({
        x: center.x - (center.x - prevPan.x) * (nextZoom / prevZoom),
        y: center.y - (center.y - prevPan.y) * (nextZoom / prevZoom),
      }));

      return nextZoom;
    });
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
        setActiveIdeaId(null);
    }
  };

  const startTopic = async (topic: string) => {
      setContext(topic);
      setShowInitialInput(false);
      setSessionStartTime(Date.now());
      
      const newIdeaId = ideaIdCounter.current++;
      const centerRect: Rect = { 
        x: (-panOffset.x + window.innerWidth / 2 - 150) / zoom, 
        y: (-panOffset.y + window.innerHeight / 2 - 100) / zoom, 
        width: 300, 
        height: 200 
      };
      
      const newIdea: Idea = {
          id: newIdeaId, 
          ...centerRect, 
          text: '', 
          terms: [],
          versions: [],
          currentVersionIndex: -1,
          isLoading: true, 
          isAsciiLoading: true,
          error: null, 
          isCollapsed: false,
      };
      setIdeas([newIdea]);
      centerOnRect(centerRect);
      await generateContentForIdea(newIdeaId, centerRect, topic);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const topic = initialTopicInput.trim();
      if (!topic) return;
      await startTopic(topic);
  };

  const handleMagicStart = async () => {
      const randomIndex = Math.floor(Math.random() * MAGIC_TOPICS.length);
      const randomTopic = MAGIC_TOPICS[randomIndex];
      await startTopic(randomTopic);
  };

  const handleSubmitNewConcept = async (e: React.FormEvent) => {
      e.preventDefault();
      const title = newConceptTitle.trim();
      if (!title) return;

      const newIdeaId = ideaIdCounter.current++;
      const rawRect: Rect = { 
        x: (-panOffset.x + window.innerWidth / 2 - 150) / zoom, 
        y: (-panOffset.y + window.innerHeight / 2 - 100) / zoom, 
        width: 300, 
        height: 200 
      };
      const snappedRect = findValidSpot(rawRect);

      const tempIdea: Idea = {
          id: newIdeaId, 
          ...snappedRect, 
          text: '', 
          terms: [],
          versions: [],
          currentVersionIndex: -1,
          isLoading: true, 
          isAsciiLoading: true,
          error: null, 
          isCollapsed: false,
      };
      setIdeas(prev => [...prev, tempIdea]);
      setIsAddingConcept(false);
      setNewConceptTitle('');
      centerOnRect(snappedRect);
      
      try {
          const currentHistory = [...ideas]
            .filter(i => !!i.text)
            .sort((a, b) => a.id - b.id)
            .map(i => i.text);
            
          const point = await getPointForConcept(title);
          const data = await getQuadrantMainContent(labels, point, title, currentHistory);
          setTotalCharsGenerated(prev => prev + data.text.length);

          setIdeas(prev => prev.map(i => {
            if (i.id === newIdeaId) {
                const newVer: IdeaVersion = { 
                  text: data.text, 
                  bridgeText: data.bridge || undefined, 
                  terms: data.terms 
                };
                const updatedVers = [...i.versions, newVer];
                return { 
                    ...i, 
                    text: data.text, 
                    bridgeText: data.bridge || undefined, 
                    terms: data.terms,
                    versions: updatedVers,
                    currentVersionIndex: updatedVers.length - 1,
                    isLoading: false 
                };
            }
            return i;
          }));

          const suggestedPaths = await getSuggestions(title, data.text);
          if (suggestedPaths.length > 0) {
            const SUGG_HEIGHT = 32;
            const SUGG_GAP = 12;
            const totalHeight = (SUGG_HEIGHT * 3) + (SUGG_GAP * 2);
            const startY = snappedRect.y + snappedRect.height / 2 - totalHeight / 2;

            const suggs: Suggestion[] = suggestedPaths.map((text, idx) => ({
              id: `sugg-${newIdeaId}-${idx}`,
              sourceId: newIdeaId,
              text,
              x: snappedRect.x + snappedRect.width + 100,
              y: startY + idx * (SUGG_HEIGHT + SUGG_GAP),
              width: 0,
              height: SUGG_HEIGHT
            }));
            setActiveSuggestions(suggs);
          }

          const ascii = await getQuadrantAsciiArt(title, data.text);
          setIdeas(prev => prev.map(i => {
            if (i.id === newIdeaId) {
                const updatedVers = [...i.versions];
                if (updatedVers[i.currentVersionIndex]) {
                  updatedVers[i.currentVersionIndex] = { ...updatedVers[i.currentVersionIndex], asciiArt: ascii };
                }
                return { 
                    ...i, 
                    asciiArt: ascii,
                    versions: updatedVers,
                    isAsciiLoading: false 
                };
            }
            return i;
          }));

      } catch (err) {
          const errorMessage = (err as Error).message || 'Failed to place concept.';
          setIdeas(prev => prev.map(i => i.id === newIdeaId ? { ...i, error: errorMessage, isLoading: false, isAsciiLoading: false } : i));
      }
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));

  const isLandingPage = showInitialInput && ideas.length === 0;

  // Stats formatting helpers
  const formatSessionTime = () => {
    if (!sessionStartTime) return "00:00";
    const diff = Math.floor((currentTime - sessionStartTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sessionStats = [
    { label: "NODES DISCOVERED", value: ideas.length },
    { label: "KNOWLEDGE EXTRACTED", value: `${totalCharsGenerated.toLocaleString()} CHARS` },
    { label: "ESTIMATED TOKENS", value: Math.ceil(totalCharsGenerated / 4).toLocaleString() },
    { label: "SESSION DURATION", value: formatSessionTime() }
  ];

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-[#F7F199]"
      onMouseDown={handleCanvasMouseDown}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.18) 1.2px, transparent 1.2px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
        }}
      />

      <div className="relative w-full h-full overflow-hidden">
        <QuadrantGrid 
          onRectSelect={handleRectSelect} 
          panOffset={panOffset} 
          onPan={handlePan}
          onZoom={handleZoom}
          zoom={zoom}
          isOverlap={() => false}
          isAutoPanning={isAutoPanning}
          showHints={!isLandingPage}
        >
          <svg 
            className="absolute inset-0 pointer-events-none overflow-visible w-full h-full"
            style={{ zIndex: 5 }}
          >
            {sortedIdeas.map((idea, index) => {
              if (index === 0) return null;
              const prevIdea = sortedIdeas[index - 1];
              return <Connector key={`conn-${prevIdea.id}-${idea.id}`} source={prevIdea.id < idea.id ? prevIdea : idea} target={prevIdea.id < idea.id ? idea : prevIdea} />;
            })}
            
            {activeSuggestions.map(s => {
              const srcNode = ideas.find(i => i.id === s.sourceId);
              return srcNode ? <SuggestionConnector key={`sconn-${s.id}`} source={srcNode} target={s} /> : null;
            })}
          </svg>

          {ideas.map((idea) => {
            const previousIdea = sortedIdeas.find(i => i.id === idea.id - 1);
            return (
              <ResponseDisplay
                key={idea.id}
                idea={idea}
                previousIdea={previousIdea}
                onRemove={handleRemoveIdea}
                onBringToFront={handleBringToFront}
                onRegenerate={handleRegenerate}
                onSwitchVersion={handleSwitchVersion}
                onExploreTerm={handleExploreTerm}
                isActive={idea.id === activeIdeaId}
              />
            );
          })}

          {activeSuggestions.map(suggestion => (
            <SuggestionNode 
              key={suggestion.id} 
              suggestion={suggestion} 
              onClick={handleSuggestionClick} 
            />
          ))}

          <div id="connector-tooltip-layer" className="absolute inset-0 pointer-events-none" style={{ zIndex: 200 }} />
        </QuadrantGrid>
      </div>

      <AnimatePresence>
        {isLandingPage && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-[40px] pointer-events-auto">
                  <BrandHeader isLanding={true} />
                  <div className="flex flex-col items-start gap-2">
                      <motion.form 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6, delay: 1.3 }}
                          onSubmit={handleInitialSubmit}
                          className="flex items-center gap-[12px] mb-0"
                      >
                          <input 
                              type="text"
                              value={initialTopicInput}
                              onChange={(e) => setInitialTopicInput(e.target.value)}
                              onFocus={() => setIsInputFocused(true)}
                              onBlur={() => setIsInputFocused(false)}
                              placeholder={isInputFocused ? "" : placeholderText}
                              className="w-[240px] h-[44px] bg-white border border-black/30 text-black text-[14pt] px-4 focus:outline-none focus:border-black transition-all shadow-sm font-garamond placeholder:text-black/40"
                          />
                          <div className="flex gap-[6px]">
                              <button 
                                  type="submit"
                                  className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-black/30 text-black hover:bg-black hover:text-white transition-all shadow-sm"
                                  title="Send"
                              >
                                  <span className="google-symbols text-[24px]">send</span>
                              </button>
                              <button 
                                  type="button"
                                  onClick={handleMagicStart}
                                  className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-black/30 text-black hover:bg-black hover:text-white transition-all shadow-sm"
                                  title="Magic Start"
                              >
                                  <span className="google-symbols text-[24px]">auto_fix_high</span>
                              </button>
                          </div>
                      </motion.form>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ duration: 0.8, delay: 1.6 }}
                        className="font-garamond text-[11pt] tracking-tight text-black mt-0 select-none text-left"
                      >
                        Dive into any kind of rabbit hole that you are curious about
                      </motion.p>
                  </div>
              </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLandingPage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 right-10 z-50 flex flex-col items-end gap-3"
          >
            {isAddingConcept && (
              <form onSubmit={handleSubmitNewConcept} className="mb-2 w-72 sm:w-80 h-12 bg-white border border-black flex items-center justify-between p-2 animate-in slide-in-from-right-4 fade-in duration-300 shadow-xl rounded-none px-4">
                  <input 
                      type="text"
                      value={newConceptTitle}
                      onChange={(e) => setNewConceptTitle(e.target.value)}
                      placeholder="Define a concept..."
                      className="bg-transparent focus:outline-none text-[9pt] uppercase font-garamond flex-grow px-2"
                      autoFocus
                  />
                  <div className="flex items-center gap-1">
                      <button type="submit" className="w-8 h-8 flex items-center justify-center hover:text-black transition-colors" aria-label="Submit">
                          <span className="google-symbols text-xl">check</span>
                      </button>
                      <button type="button" onClick={() => { setIsAddingConcept(false); setNewConceptTitle(''); }} className="w-8 h-8 flex items-center justify-center hover:text-red-500 transition-colors" aria-label="Cancel">
                          <span className="google-symbols text-xl">close</span>
                      </button>
                  </div>
              </form>
            )}

            <div className="flex items-center gap-[6px]">
              {/* Stats Ticker */}
              <div className="h-11 min-w-[180px] bg-black border border-black/30 flex items-center px-4 relative overflow-hidden shadow-sm">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeStatIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="flex flex-col items-start justify-center"
                  >
                    <span className="font-ibm-plex text-[5.5pt] uppercase tracking-[0.15em] text-white/50 leading-none mb-1">
                      {sessionStats[activeStatIndex].label}
                    </span>
                    <span className="font-ibm-plex italic text-[9pt] text-white leading-none">
                      {sessionStats[activeStatIndex].value}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button 
                onClick={zoomIn}
                className="w-11 h-11 flex items-center justify-center bg-black border border-black/30 text-white hover:bg-neutral-800 transition-all shadow-sm"
                title="Zoom In"
              >
                <span className="google-symbols text-[22px]">zoom_in</span>
              </button>
              <button 
                onClick={zoomOut}
                className="w-11 h-11 flex items-center justify-center bg-black border border-black/30 text-white hover:bg-neutral-800 transition-all shadow-sm"
                title="Zoom Out"
              >
                <span className="google-symbols text-[22px]">zoom_out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLandingPage && (
        <div className="absolute bottom-8 left-10 z-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <BrandHeader isLanding={false} />
        </div>
      )}
    </div>
  );
};

export default App;