
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import { AiService } from './services/aiService';
import { AnalysisResult, StrategicTheme, WhiteboardNote, StrategicPriority, AnalysisMode, AuthUser } from './types';
import { fetchUser, login, logout } from './services/auth';
import { getBoard, updateBoard, shareBoard } from './services/boardsApi';
import { Dashboard } from './components/Dashboard';

// Declare Mermaid globally
declare const mermaid: any;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const REFRAME_MESSAGES = [
  "Consulting the Wise Otter...",
  "Stacking the clams...",
  "Floating downstream together...",
  "Holding hands while sleeping...",
  "Doing a barrel roll...",
  "Cracking the toughest nuts...",
  "Building a bigger dam...",
  "Finding the shiniest pebbles...",
  "Tidying up the riverbank..."
];

// Memoized Components to prevent unnecessary re-renders during panning/zooming
const MermaidRenderer: React.FC<{ code: string }> = React.memo(({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current && code) {
        try {
          mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);
          setSvg(svg);
        } catch (e) {
          console.error('Mermaid render error:', e);
          setSvg('<div class="text-red-500 p-4">Failed to render diagram. Check syntax.</div>');
        }
      }
    };
    renderDiagram();
  }, [code]);

  return (
    <div className="w-full flex justify-center bg-white p-8 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
        className="w-full"
      />
    </div>
  );
});

const WireframeRenderer: React.FC<{ code: string }> = React.memo(({ code }) => {
  return (
    <div className="w-full bg-slate-100 p-8 rounded-xl border border-slate-200 overflow-hidden relative group">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden min-h-[400px]">
        {/* Render generated HTML safely */}
        <div dangerouslySetInnerHTML={{ __html: code }} />
      </div>
    </div>
  );
});

interface NoteCardProps {
  note: WhiteboardNote;
  index: number;
  themeIndex: number;
  themeColor?: string;
  isDragging: boolean;
  isEditing: boolean;
  styles: { container: string; text: string };
  editText: string;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onGenerateVideo: (e: React.MouseEvent) => void;
  onGenerateImage: (e: React.MouseEvent) => void;
  onRevert: (e: React.MouseEvent) => void;
}

const NoteCard: React.FC<NoteCardProps> = React.memo(({
  note, index, themeIndex, themeColor, isDragging, isEditing, styles, editText,
  onDragStart, onDragEnd, onDoubleClick, onChangeText, onSave, onGenerateVideo, onGenerateImage, onRevert
}) => {
  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDoubleClick={onDoubleClick}
      className={styles.container + (isEditing ? ' cursor-text scale-100 !shadow-lg bg-white/50 border-indigo-400 z-20' : '')}
      style={note.imageUrl ? { backgroundImage: `url(${note.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {note.imageUrl && !isEditing && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
      )}

      {isEditing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => onChangeText(e.target.value)}
          onBlur={onSave}
          className="w-full h-full bg-transparent resize-none focus:outline-none text-center relative z-10 text-slate-900"
        />
      ) : (
        <p className={`${styles.text} ${note.imageUrl ? '!text-white drop-shadow-md relative z-10 font-bold' : ''}`}>{note.text}</p>
      )}

      {!note.videoUrl && !isEditing && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-20">
          {note.imageUrl ? (
            <button onClick={onRevert} className="bg-white/90 p-1.5 rounded-full text-slate-600 hover:text-red-600 shadow-sm" title="Undo Visual">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
          ) : (
            <button onClick={onGenerateImage} className="bg-white/90 p-1.5 rounded-full text-indigo-600 hover:text-indigo-800 shadow-sm" title="Visualize Idea">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            </button>
          )}
          <button onClick={onGenerateVideo} className="bg-white/90 p-1.5 rounded-full text-indigo-600 hover:text-indigo-800 shadow-sm" title="Generate Video">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
      )}
      {note.videoUrl && (
        <div className="absolute inset-0 bg-black z-30">
          <video src={note.videoUrl} className="w-full h-full object-cover" autoPlay loop muted />
        </div>
      )}
    </div>
  );
});

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('strategy');

  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    logout();
  };

  // Handle Auth State
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boardIdFromUrl = params.get('board');
    if (boardIdFromUrl) {
      setSelectedBoardId(boardIdFromUrl);
    }

    let isMounted = true;
    fetchUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load authentication profile.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync with Azure API
  const lastFromServer = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !selectedBoardId) {
      if (!selectedBoardId) setResult(null);
      lastFromServer.current = null;
      return;
    }

    let isActive = true;

    const syncBoard = async () => {
      try {
        const board = await getBoard(selectedBoardId);
        if (!isActive) return;
        const data = board.result ?? null;
        const dataStr = JSON.stringify(data);
        if (dataStr !== lastFromServer.current) {
          lastFromServer.current = dataStr;
          setResult(data);
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || "Failed to load board data.");
        }
      }
    };

    syncBoard();
    const interval = window.setInterval(syncBoard, 5000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [user, selectedBoardId]);

  // Persist to Azure (only if locally changed)
  useEffect(() => {
    if (user && result && selectedBoardId) {
      const currentStr = JSON.stringify(result);
      if (currentStr !== lastFromServer.current) {
        updateBoard(selectedBoardId, {
          result
        }).catch((err: any) => {
          setError(err.message || "Failed to save board changes.");
        });
        lastFromServer.current = currentStr;
      }
    }
  }, [user, result, selectedBoardId]);

  // Handle Share functionality
  const handleShare = async () => {
    if (!selectedBoardId || !shareEmail.trim()) return;
    try {
      await shareBoard(selectedBoardId, shareEmail.trim());
      setShareEmail("");
      setIsSharing(false);
      showToast(`Shared with ${shareEmail.trim()}!`);
    } catch (err) {
      alert("Failed to share. Make sure you are the owner.");
    }
  };

  const handleCopyLink = () => {
    if (!selectedBoardId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?board=${selectedBoardId}`;
    navigator.clipboard.writeText(shareUrl);
    showToast("Link copied to clipboard!");
    setIsSharing(false);
  };

  // Keep a copy of the original "Cluster" analysis so we can switch back
  const [originalResult, setOriginalResult] = useState<AnalysisResult | null>(null);
  const [currentFramework, setCurrentFramework] = useState<'clusters' | 'swot' | 'eisenhower' | 'roadmap' | 'bmc'>('clusters');
  const [isReframing, setIsReframing] = useState(false);

  // Reframing Animation State
  const [reframeMsgIdx, setReframeMsgIdx] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'raw' | 'code'>('whiteboard');

  // Drag and Drop States
  const [draggedNote, setDraggedNote] = useState<{ themeIdx: number; noteIdx: number } | null>(null);
  const [dragOverThemeIdx, setDragOverThemeIdx] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<{ fromThemeIdx: number; noteIdx: number; toThemeIdx: number } | null>(null);

  // Editing State
  const [editingNote, setEditingNote] = useState<{ themeIdx: number; noteIdx: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [editingTitle, setEditingTitle] = useState<{ themeIdx: number } | null>(null);
  const [editTitleText, setEditTitleText] = useState("");

  // Strategic Gap Adding State
  const [isAddingGap, setIsAddingGap] = useState(false);
  const [newGapText, setNewGapText] = useState("");
  const [newGapType, setNewGapType] = useState<'Opportunity' | 'Action Item'>('Opportunity');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Video & Image State
  const [generatingVideoFor, setGeneratingVideoFor] = useState<string | null>(null); // Note ID
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null); // Note ID
  const [fullScreenVideo, setFullScreenVideo] = useState<string | null>(null);

  // Strategic Action Plan State
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [groundingContext, setGroundingContext] = useState("");
  const [showContextModal, setShowContextModal] = useState(false);
  const [hoveredPriorityId, setHoveredPriorityId] = useState<string | null>(null);

  // Viewport State (Zoom & Pan) - REFACTORED FOR PERFORMANCE
  const [zoomLevel, setZoomLevel] = useState(100); // Only for UI display
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });

  // SEPARATE REFS: viewport for events/clipping, canvas for transform
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isPanningRef = useRef(false);
  const lastPanPoint = useRef<{ x: number, y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  // View Menu State
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Options
  const [useColorCoding, setUseColorCoding] = useState(true);
  const [respectLayout, setRespectLayout] = useState(true);
  const [gapAnalysis, setGapAnalysis] = useState(true);
  const [usePostItAesthetic, setUsePostItAesthetic] = useState(true);

  const ai = useMemo(() => new AiService(), []);
  const userLabel = user?.name || user?.email || "Account";
  const userInitial = userLabel.charAt(0).toUpperCase();

  // Performance: Direct DOM update to avoid React render cycle on pan/zoom
  // We now target the CANVAS ref, not the viewport ref
  const updateTransform = () => {
    if (canvasRef.current) {
      const { x, y, scale } = transformRef.current;
      canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
  };

  // Ensure transform is applied after renders (e.g. data changes)
  useEffect(() => {
    updateTransform();
  });

  // Cycle Reframing Messages
  useEffect(() => {
    let interval: any;
    if (isReframing) {
      setReframeMsgIdx(0);
      interval = setInterval(() => {
        setReframeMsgIdx(prev => (prev + 1) % REFRAME_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isReframing]);

  // Handle click outside for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // No longer needed: Result is persisted via Azure API

  // Capture original result on first analysis for reverting
  useEffect(() => {
    if (result && !originalResult && currentFramework === 'clusters') {
      setOriginalResult(result);
    }
  }, [result, originalResult, currentFramework]);

  // Initialize Chat when result is ready
  useEffect(() => {
    if (result) {
      ai.startChat(result);
      if (chatMessages.length === 0) {
        setChatMessages([{ role: 'model', text: "I've analyzed your whiteboard. Ask me anything about the strategy, themes, or gaps!" }]);
      }
    }
  }, [result, ai]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Toast System
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --------------- EXPORT FUNCTIONS ---------------- //

  const handleExportPDF = () => {
    setIsExportMenuOpen(false);
    const originalTitle = document.title;
    const date = new Date().toISOString().split('T')[0];
    document.title = `OtterBoard_Strategy_${date}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }, 100);
  };

  const handleExportMiroCSV = () => {
    if (!result) return;
    setIsExportMenuOpen(false);

    // Miro CSV Format: Content, Shape, Background Color
    let csv = "Content,Shape,BackgroundColor\n";

    result.themes.forEach(theme => {
      // Add a header card for the theme
      csv += `"${theme.title.replace(/"/g, '""')}\n\n${theme.metaInsight.replace(/"/g, '""')}","Rectangle","#F3F4F6"\n`;

      theme.notes.forEach(note => {
        // Map internal colors to hex for Miro (or closest approx)
        let hex = "#FEF3C7"; // Default Yellow
        const c = theme.color || 'yellow';
        if (c === 'pink') hex = "#FBCFE8";
        if (c === 'green') hex = "#BBF7D0";
        if (c === 'blue') hex = "#BFDBFE";
        if (c === 'orange') hex = "#FED7AA";

        csv += `"${note.text.replace(/"/g, '""')}","Square","${hex}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'otterboard_miro_import.csv';
    a.click();
    showToast("Miro CSV downloaded");
  };

  const handleExportJiraCSV = () => {
    if (!result) return;
    setIsExportMenuOpen(false);

    // Jira CSV Format: Summary, Description, Priority, Issue Type
    let csv = "Summary,Description,Priority,Issue Type\n";

    // Export Action Plan if available, otherwise export all notes
    if (result.actionPlan) {
      result.actionPlan.priorities.forEach(p => {
        const priority = p.type === 'Big Rock' ? 'High' : 'Low';
        csv += `"${p.title.replace(/"/g, '""')}","${p.reasoning.replace(/"/g, '""')}","${priority}","Task"\n`;
      });
    } else {
      // Fallback: Export all notes as tasks
      result.themes.forEach(theme => {
        theme.notes.forEach(note => {
          csv += `"${note.text.replace(/"/g, '""')}","Insight: ${theme.metaInsight.replace(/"/g, '""')}","Medium","Task"\n`;
        });
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jira_backlog_import.csv';
    a.click();
    showToast("Jira CSV downloaded");
  };

  const handleCopyMarkdown = () => {
    if (!result) return;
    setIsExportMenuOpen(false);
    navigator.clipboard.writeText(result.rawMarkdown);
    showToast("Markdown copied to clipboard");
  };

  // --------------- GESTURE HANDLING (PAN & ZOOM) ---------------- //

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== 'whiteboard') return;
    const target = e.target as HTMLElement;
    // Allow interaction with inputs/buttons/textareas
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.no-drag')) {
      return;
    }
    isPanningRef.current = true;
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current || !lastPanPoint.current) return;
    e.preventDefault();
    const deltaX = e.clientX - lastPanPoint.current.x;
    const deltaY = e.clientY - lastPanPoint.current.y;

    transformRef.current.x += deltaX;
    transformRef.current.y += deltaY;
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
    updateTransform();
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    lastPanPoint.current = null;
  };

  // Touch Handling with Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTab !== 'whiteboard') return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.no-drag')) {
      return;
    }

    if (e.touches.length === 2) {
      // Pinch Start
      isPanningRef.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1) {
      // Pan Start
      isPanningRef.current = true;
      lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanningRef.current) return;

    if (e.touches.length === 2 && lastPinchDist.current) {
      // Pinch Zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastPinchDist.current;
      const zoomFactor = delta * 0.005; // Sensitivity

      const newScale = Math.min(Math.max(transformRef.current.scale + zoomFactor, 0.2), 3);
      transformRef.current.scale = newScale;
      lastPinchDist.current = dist;
      updateTransform();
    } else if (e.touches.length === 1 && lastPanPoint.current) {
      // Pan
      const deltaX = e.touches[0].clientX - lastPanPoint.current.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.current.y;

      transformRef.current.x += deltaX;
      transformRef.current.y += deltaY;
      lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateTransform();
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    lastPanPoint.current = null;
    lastPinchDist.current = null;
    // Update UI state only at end of gesture
    setZoomLevel(Math.round(transformRef.current.scale * 100));
  };

  const handleZoomBtn = (delta: number) => {
    const newScale = Math.min(Math.max(transformRef.current.scale + delta, 0.2), 3);
    transformRef.current.scale = newScale;
    updateTransform();
    setZoomLevel(Math.round(newScale * 100));
  };

  const handleResetView = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    updateTransform();
    setZoomLevel(100);
  };

  // ---------------------------------------------------------------- //

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await ai.analyzeWhiteboard(images, analysisMode, {
        useColorCoding,
        respectLayout,
        gapAnalysis
      });
      setResult(response);
      setOriginalResult(response);
      setCurrentFramework('clusters');
    } catch (err: any) {
      setError(err.message || "Failed to analyze the whiteboard. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFrameworkChange = async (framework: 'clusters' | 'swot' | 'eisenhower' | 'roadmap' | 'bmc') => {
    setIsViewMenuOpen(false); // Close menu on selection
    if (framework === currentFramework) return;
    if (!result || !originalResult || result.mode !== 'strategy') return;

    if (framework === 'clusters') {
      setResult(originalResult);
      setCurrentFramework('clusters');
      return;
    }

    setIsReframing(true);
    try {
      const newThemes = await ai.reframeStrategy(originalResult.themes, framework);
      setResult({
        ...result,
        themes: newThemes
      });
      setCurrentFramework(framework);
    } catch (err: any) {
      setError("Failed to apply framework: " + err.message);
    } finally {
      setIsReframing(false);
    }
  };

  const handleGenerateActionPlan = async () => {
    if (!result || result.mode !== 'strategy') return;
    setIsGeneratingPlan(true);
    try {
      const plan = await ai.generateActionPlan(result.themes, groundingContext);
      setResult({ ...result, actionPlan: plan });
      setShowActionPlan(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate action plan.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatSending(true);

    try {
      const response = await ai.sendMessage(userMsg);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error responding to that." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleGenerateVideo = async (note: WhiteboardNote, themeIdx: number, noteIdx: number) => {
    if (generatingVideoFor) return;

    setGeneratingVideoFor(note.id);
    try {
      const videoUrl = await ai.generateVideo(note.text);
      if (result) {
        const newThemes = [...result.themes];
        newThemes[themeIdx].notes[noteIdx] = { ...note, videoUrl };
        setResult({ ...result, themes: newThemes });
      }
    } catch (err: any) {
      setError(`Video generation failed: ${err.message}`);
    } finally {
      setGeneratingVideoFor(null);
    }
  };

  const handleGenerateImage = async (note: WhiteboardNote, themeIdx: number, noteIdx: number) => {
    if (generatingImageFor || generatingVideoFor) return;
    setGeneratingImageFor(note.id);

    try {
      const imageUrl = await ai.generateImage(note.text);
      if (result) {
        const newThemes = [...result.themes];
        newThemes[themeIdx].notes[noteIdx] = { ...note, imageUrl };
        setResult({ ...result, themes: newThemes });
      }
    } catch (err: any) {
      setError(`Image generation failed: ${err.message}`);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleRevertNote = (themeIdx: number, noteIdx: number) => {
    if (!result) return;
    const newThemes = [...result.themes];
    const note = newThemes[themeIdx].notes[noteIdx];
    // Remove imageUrl and keep everything else
    newThemes[themeIdx].notes[noteIdx] = { ...note, imageUrl: undefined };
    setResult({ ...result, themes: newThemes });
  };

  const handleDragStart = (e: React.DragEvent, themeIdx: number, noteIdx: number) => {
    // We can still use state for drag and drop logic as it is distinct from pan/zoom
    setDraggedNote({ themeIdx, noteIdx });
  };

  const handleDragOver = (e: React.DragEvent, themeIdx: number) => {
    e.preventDefault();
    if (draggedNote && draggedNote.themeIdx !== themeIdx) {
      if (dragOverThemeIdx !== themeIdx) {
        setDragOverThemeIdx(themeIdx);
      }
    }
  };

  const handleDragLeave = (themeIdx: number) => {
    if (dragOverThemeIdx === themeIdx) {
      setDragOverThemeIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, toThemeIdx: number) => {
    e.preventDefault();
    setDragOverThemeIdx(null);
    if (draggedNote && draggedNote.themeIdx !== toThemeIdx) {
      // Direct state update for immediate feedback, simpler than pending for this refactor
      if (!result) return;
      const newThemes = [...result.themes];
      const [note] = newThemes[draggedNote.themeIdx].notes.splice(draggedNote.noteIdx, 1);
      newThemes[toThemeIdx].notes.push(note);
      setResult({ ...result, themes: newThemes });
    }
    setDraggedNote(null);
  };

  const handleNoteDoubleClick = (themeIdx: number, noteIdx: number, currentText: string) => {
    setEditingNote({ themeIdx, noteIdx });
    setEditText(currentText);
  };

  const handleNoteSave = () => {
    if (!editingNote || !result) return;
    const newThemes = [...result.themes];
    newThemes[editingNote.themeIdx].notes[editingNote.noteIdx].text = editText;
    setResult({ ...result, themes: newThemes });
    setEditingNote(null);
  };

  const handleAddNote = (themeIdx: number) => {
    if (!result) return;
    const newThemes = [...result.themes];
    newThemes[themeIdx].notes.push({ id: crypto.randomUUID(), text: "New Idea" });
    setResult({ ...result, themes: newThemes });
    setEditingNote({ themeIdx, noteIdx: newThemes[themeIdx].notes.length - 1 });
    setEditText("New Idea");
  };

  const handleThemeTitleDoubleClick = (themeIdx: number, currentTitle: string) => {
    setEditingTitle({ themeIdx });
    setEditTitleText(currentTitle);
  };

  const handleThemeTitleSave = () => {
    if (!editingTitle || !result) return;
    const newThemes = [...result.themes];
    newThemes[editingTitle.themeIdx].title = editTitleText;
    setResult({ ...result, themes: newThemes });
    setEditingTitle(null);
  };

  const handleThemeColorChange = (themeIdx: number, color: 'yellow' | 'pink' | 'green' | 'blue' | 'orange') => {
    if (!result) return;
    const newThemes = [...result.themes];
    newThemes[themeIdx].color = color;
    setResult({ ...result, themes: newThemes });
  };

  // Helper to generate styles - wrapped in useCallback if we were passing it, 
  // but since we compute inside loop, we'll keep it simple or extract logic.
  // Extracting logic for NoteCard component
  const getNoteStyles = (note: WhiteboardNote, index: number, isBeingDragged: boolean, themeColor?: string) => {
    const text = note.text.toLowerCase();

    let isHighlighted = false;
    let isDimmed = false;

    if (showActionPlan && hoveredPriorityId && result?.actionPlan) {
      const activePriority = result.actionPlan.priorities.find(p => p.id === hoveredPriorityId);
      if (activePriority) {
        if (activePriority.sourceNoteIds.includes(note.id)) {
          isHighlighted = true;
        } else {
          isDimmed = true;
        }
      }
    }

    // Auto-tag logic
    const isPinkTag = text.includes('[pink]');
    const isGreenTag = text.includes('[green]');
    const isBlueTag = text.includes('[blue]');
    const isOrangeTag = text.includes('[orange]');
    const isYellowTag = text.includes('[yellow]');

    const isPinkKey = text.includes('risk') || text.includes('problem');
    const isGreenKey = text.includes('opportunity') || text.includes('idea');

    let color = themeColor || 'yellow';

    if (isPinkTag) color = 'pink';
    else if (isGreenTag) color = 'green';
    else if (isBlueTag) color = 'blue';
    else if (isOrangeTag) color = 'orange';
    else if (isYellowTag) color = 'yellow';
    else if (!themeColor) {
      if (isPinkKey) color = 'pink';
      else if (isGreenKey) color = 'green';
    }

    const rotations = ['rotate-1', '-rotate-1', 'rotate-0', '-rotate-[0.5deg]', 'rotate-[0.5deg]'];
    const rotation = usePostItAesthetic ? rotations[index % rotations.length] : 'rotate-0';
    const baseTransition = 'transition-all duration-300 ease-out';
    const cursorClass = isBeingDragged ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing';
    const dragOpacity = isBeingDragged ? 'opacity-20 scale-90 blur-[1px]' : 'opacity-100 scale-100';

    const highlightClasses = isHighlighted ? 'ring-[6px] ring-indigo-500 scale-110 z-50 shadow-[0_20px_50px_rgba(79,70,229,0.3)] !opacity-100 !blur-0' : '';
    const dimClasses = isDimmed ? '!opacity-20 blur-[2px] scale-95 grayscale' : '';

    if (usePostItAesthetic) {
      let bgClass = 'bg-[#fef9c3]';
      let borderClass = 'border-yellow-200/50';
      if (color === 'pink') { bgClass = 'bg-[#fce7f3]'; borderClass = 'border-pink-200/50'; }
      else if (color === 'green') { bgClass = 'bg-[#dcfce7]'; borderClass = 'border-green-200/50'; }
      else if (color === 'blue') { bgClass = 'bg-[#dbeafe]'; borderClass = 'border-blue-200/50'; }
      else if (color === 'orange') { bgClass = 'bg-[#ffedd5]'; borderClass = 'border-orange-200/50'; }
      else if (color === 'yellow') { bgClass = 'bg-[#fef9c3]'; borderClass = 'border-yellow-200/50'; }

      return {
        container: `${baseTransition} ${cursorClass} ${dragOpacity} ${highlightClasses} ${dimClasses} p-2 aspect-square flex flex-col items-center justify-center text-center shadow-[2px_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[10px_12px_24px_rgba(0,0,0,0.12)] border ${borderClass} ${bgClass} ${rotation} relative overflow-hidden group hover:-translate-y-1 print:shadow-none print:border-slate-300 print:break-inside-avoid`,
        text: 'text-slate-800 text-sm font-medium leading-tight tracking-tight font-serif italic antialiased px-2 select-none line-clamp-4'
      };
    }

    let borderColor = 'border-amber-400';
    if (color === 'pink') borderColor = 'border-pink-400';
    else if (color === 'green') borderColor = 'border-emerald-400';
    else if (color === 'blue') borderColor = 'border-blue-400';
    else if (color === 'orange') borderColor = 'border-orange-400';

    const standardContainerClasses = note.videoUrl
      ? `${baseTransition} ${cursorClass} ${dragOpacity} ${highlightClasses} ${dimClasses} rounded-lg shadow-sm border-0 bg-black overflow-hidden hover:scale-[1.02] relative group aspect-[9/16] print:shadow-none print:break-inside-avoid`
      : `${baseTransition} ${cursorClass} ${dragOpacity} ${highlightClasses} ${dimClasses} p-4 rounded-lg shadow-sm border-l-4 bg-white hover:scale-[1.02] relative group ${borderColor} print:shadow-none print:border-slate-300 print:break-inside-avoid`;

    return {
      container: standardContainerClasses,
      text: 'text-slate-700 text-sm leading-snug font-medium font-sans select-none'
    };
  };

  const themeColors = ['yellow', 'pink', 'green', 'blue', 'orange'] as const;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans transition-colors duration-500 print:bg-white print:h-auto print:overflow-visible">
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body, #root, main, .overflow-auto, .overflow-hidden { 
            overflow: visible !important; 
            height: auto !important; 
          }
          .transform-layer {
            transform: none !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* HEADER: Removed overflow-x-auto to fix dropdown clipping */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40 shadow-sm shrink-0 print:hidden flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0">
          {selectedBoardId && (
            <button
              onClick={() => setSelectedBoardId(null)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all mr-2"
              title="Workspaces"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">OtterBoard</h1>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hidden sm:inline">Your Friendly Workshop Assistant</span>
          </div>
        </div>
        <div className="flex gap-4 items-center shrink-0">
          {result && result.mode === 'strategy' && (
            <>
              <button
                onClick={() => setShowContextModal(true)}
                className="text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="hidden md:inline">Set Context</span>
              </button>

              {activeTab === 'whiteboard' && (
                <div className="relative" ref={viewMenuRef}>
                  <button
                    onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                    className="text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
                  >
                    <span className="opacity-50 hidden sm:inline">View:</span>
                    <span className="sm:hidden">View</span>
                    <span className="hidden sm:inline">
                      {currentFramework === 'clusters' && 'Original Clusters'}
                      {currentFramework === 'swot' && 'SWOT'}
                      {currentFramework === 'eisenhower' && 'Eisenhower'}
                      {currentFramework === 'roadmap' && 'Roadmap'}
                      {currentFramework === 'bmc' && 'Biz Model'}
                    </span>
                    <svg className={`w-3 h-3 ml-1 transition-transform duration-200 ${isViewMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isViewMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                      <button onClick={() => handleFrameworkChange('clusters')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Original Clusters</button>
                      <button onClick={() => handleFrameworkChange('swot')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">SWOT Analysis</button>
                      <button onClick={() => handleFrameworkChange('eisenhower')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Eisenhower Matrix</button>
                      <button onClick={() => handleFrameworkChange('roadmap')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Roadmap</button>
                      <button onClick={() => handleFrameworkChange('bmc')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors text-indigo-600">Business Model Canvas</button>
                    </div>
                  )}
                </div>
              )}

              {!result.actionPlan ? (
                <button onClick={handleGenerateActionPlan} disabled={isGeneratingPlan} className="bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
                  {isGeneratingPlan ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : 'Brief'}
                </button>
              ) : (
                <button onClick={() => setShowActionPlan(!showActionPlan)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${showActionPlan ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200'}`}>
                  {showActionPlan ? 'Hide' : 'Brief'}
                </button>
              )}

              <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

              {/* Export Menu */}
              <div className="relative" ref={exportMenuRef}>
                <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest hidden sm:flex items-center gap-2">
                  Export <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
                {isExportMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-2 border-b border-slate-50"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Integrations</span></div>
                    <button onClick={handleExportMiroCSV} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                      <span className="text-lg">🟨</span> Miro / Mural (CSV)
                    </button>
                    <button onClick={handleExportJiraCSV} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                      <span className="text-lg">🔷</span> Jira Backlog (CSV)
                    </button>
                    <button onClick={handleCopyMarkdown} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                      <span className="text-lg">📝</span> Notion / Markdown
                    </button>
                    <div className="p-2 border-t border-b border-slate-50"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Files</span></div>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                      <span className="text-lg">📄</span> Standard PDF
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {result && !result.mode.includes('strategy') && <button type="button" onClick={handleExportPDF} className="text-slate-500 hover:text-indigo-600 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors hidden sm:block">PDF</button>}

          {selectedBoardId && (
            <div className="relative">
              <button
                onClick={() => setIsSharing(!isSharing)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </button>
              {isSharing && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-[100] animate-in slide-in-from-top-4 duration-300">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Share Board</h3>
                  <div className="space-y-4">
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      Copy Share Link
                    </button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">OR INVITE BY EMAIL</span></div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={e => setShareEmail(e.target.value)}
                        placeholder="collaborator@example.com"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                      <button
                        onClick={handleShare}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        Send Invite
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-xs font-bold text-slate-900">{userLabel}</span>
                <button onClick={handleLogout} className="text-[10px] font-bold text-slate-500 hover:text-red-500 uppercase tracking-wider">Sign Out</button>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs border border-indigo-200">
                {userInitial}
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1119.9 10.1M15 21v-4a3 3 0 00-3-3H9a3 3 0 00-3 3v4" /></svg>
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto print:block relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Modal Logic (Context, Reframe) Same as before */}
        {showContextModal && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Strategic Grounding</h3>
                <p className="text-slate-500 text-sm">Paste your OKRs, Mission Statement, or Meeting Constraints here.</p>
              </div>
              <textarea className="w-full h-40 bg-slate-50 rounded-xl p-4 text-sm text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="e.g. Our Q3 goal is to reduce churn by 10%." value={groundingContext} onChange={(e) => setGroundingContext(e.target.value)} />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowContextModal(false)} className="px-6 py-3 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors">Close</button>
                <button onClick={() => setShowContextModal(false)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">Save Context</button>
              </div>
            </div>
          </div>
        )}

        {isReframing && (
          <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex items-center justify-center flex-col gap-8">
            <div className="relative w-32 h-32">
              {/* Ping effect */}
              <div className="absolute inset-0 border-8 border-indigo-100 rounded-full animate-ping opacity-75"></div>
              {/* Static ring */}
              <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
              {/* Spinner */}
              <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">
                🦦
              </div>
            </div>

            <div className="text-center space-y-4 max-w-lg px-6">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Reframing Strategy</h3>
              <div className="h-8 flex items-center justify-center">
                <p className="text-indigo-600 font-bold text-xl transition-all duration-300 transform">
                  {REFRAME_MESSAGES[reframeMsgIdx]}
                </p>
              </div>
            </div>
          </div>
        )}

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="max-w-2xl space-y-6">
              <div className="text-6xl mb-4">🦦</div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Your Strategy, <br />Stored Securely.</h1>
              <p className="text-slate-500 text-xl font-medium leading-relaxed">
                Sign in to transform your whiteboard brainstorms into actionable enterprise-grade roadmaps.
                Your data is now stored in the cloud for infinite scalability.
              </p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405 1.405M19.595 18.405L21 17m-9 4a9 9 0 10-9-9 9 9 0 009 9zm0-11a3 3 0 110 6 3 3 0 010-6z" /></svg>
                Continue with Entra ID
              </button>
            </div>
          </div>
        ) : !selectedBoardId ? (
          <Dashboard user={user} onSelectBoard={setSelectedBoardId} />
        ) : !result && !isAnalyzing ? (
          <div className="max-w-7xl mx-auto p-6 md:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 print:hidden overflow-y-auto">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-3">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Tame the Whiteboard Chaos.</h2>
                  <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                    Upload whiteboard photos. OtterBoard digitizes sticky notes, generates mermaid charts from flow diagrams, and writes React code from wireframes.
                  </p>
                </div>
                <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200">
                  <ImageUploader images={images} setImages={setImages} />
                </div>

                {/* MODE SELECTOR */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-col md:flex-row gap-2 shadow-sm">
                  <button
                    onClick={() => setAnalysisMode('strategy')}
                    className={`flex-1 py-4 rounded-xl flex flex-row md:flex-col items-center justify-center gap-3 transition-all ${analysisMode === 'strategy' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <span className="text-2xl">🟨</span>
                    <span className="text-xs font-black uppercase tracking-widest">Strategy Board</span>
                  </button>
                  <button
                    onClick={() => setAnalysisMode('process')}
                    className={`flex-1 py-4 rounded-xl flex flex-row md:flex-col items-center justify-center gap-3 transition-all ${analysisMode === 'process' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <span className="text-2xl">💠</span>
                    <span className="text-xs font-black uppercase tracking-widest">Process Flow</span>
                  </button>
                  <button
                    onClick={() => setAnalysisMode('wireframe')}
                    className={`flex-1 py-4 rounded-xl flex flex-row md:flex-col items-center justify-center gap-3 transition-all ${analysisMode === 'wireframe' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <span className="text-2xl">📱</span>
                    <span className="text-xs font-black uppercase tracking-widest">UI Wireframe</span>
                  </button>
                </div>
              </div>

              <aside className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 h-fit space-y-10">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-4">Analysis Settings</h3>

                  {analysisMode === 'strategy' ? (
                    <div className="space-y-5">
                      {[
                        { label: 'Color Awareness', state: useColorCoding, set: setUseColorCoding, desc: 'Group notes by color' },
                        { label: 'Spatial Grouping', state: respectLayout, set: setRespectLayout, desc: 'Respect physical columns' },
                        { label: 'Gap Identification', state: gapAnalysis, set: setGapAnalysis, desc: 'Find missing items' },
                        { label: 'Post-it Aesthetic', state: usePostItAesthetic, set: setUsePostItAesthetic, desc: 'Realistic look' },
                      ].map((opt, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div><p className="text-sm font-bold text-slate-800">{opt.label}</p></div>
                          <button onClick={() => opt.set(!opt.state)} className={`w-11 h-6 rounded-full transition-all relative ${opt.state ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${opt.state ? 'left-6' : 'left-1'}`}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm leading-relaxed">
                      {analysisMode === 'process' && "Azure OpenAI will identify flowcharts, sequence diagrams, or entity graphs and convert them to editable Mermaid.js code."}
                      {analysisMode === 'wireframe' && "Azure OpenAI will identify UI components and layout to generate a responsive HTML structure using Tailwind CSS."}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={images.length === 0}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:grayscale transition-all active:scale-95"
                >
                  {analysisMode === 'strategy' ? 'Digitize Board' : analysisMode === 'process' ? 'Generate Diagram' : 'Build UI Code'}
                </button>
              </aside>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center justify-center flex-1 space-y-10 bg-white print:hidden">
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="relative w-24 h-24 mb-8">
                {/* Spinner Ring */}
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  🦦
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Digitizing Workshop Artifacts...</h2>
              <p className="text-slate-400 font-medium max-w-md mx-auto text-center">
                OtterBoard is transcribing handwriting and clustering your ideas into a framework.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden bg-slate-200/50 print:bg-white print:h-auto print:overflow-visible relative touch-none">
            <div className="flex items-center justify-between py-4 px-4 md:px-12 shrink-0 no-print bg-white/80 backdrop-blur-md border-b border-slate-200 print:hidden z-10 overflow-x-auto">
              <div className="flex gap-4 shrink-0">
                <button
                  onClick={() => { setActiveTab('whiteboard'); handleResetView(); }}
                  className={`px-4 md:px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {result?.mode === 'strategy' ? 'Board' : 'Preview'}
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-4 md:px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'raw' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Raw
                </button>
                {(result?.mode === 'process' || result?.mode === 'wireframe') && (
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-4 md:px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'code' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Code
                  </button>
                )}
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <button onClick={() => setResult(null)} className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="hidden sm:inline">New Session</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative touch-none">
              {/* CANVAS AREA - Touch Listeners added here */}
              <div
                className={`flex-1 overflow-hidden print:overflow-visible print:h-auto transition-all duration-300 ${showActionPlan && result?.mode === 'strategy' ? 'mr-0 md:mr-[400px]' : ''} cursor-grab active:cursor-grabbing touch-none`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                ref={viewportRef}
              >
                {activeTab === 'whiteboard' ? (
                  <div
                    ref={canvasRef}
                    className="transform-layer transition-transform duration-0 origin-top-left min-h-full min-w-full"
                  >
                    <div className={`${(usePostItAesthetic && result?.mode === 'strategy') ? 'p-8 md:p-16 flex gap-12 bg-white shadow-inner relative overflow-visible w-max' : 'max-w-7xl mx-auto p-8 md:p-16'} print:p-0 print:block print:w-full print:shadow-none print:min-w-0 print:h-auto pointer-events-auto`}>

                      {/* STRATEGY RENDERING */}
                      {result?.mode === 'strategy' && (
                        <div className={`flex gap-12 ${!usePostItAesthetic ? 'flex-col' : 'h-fit'} print:flex-col print:w-full print:gap-8`}>
                          {result.themes.map((theme, i) => (
                            <div key={i} onDragOver={(e) => handleDragOver(e, i)} onDragLeave={() => handleDragLeave(i)} onDrop={(e) => handleDrop(e, i)} className={`flex flex-col transition-all duration-300 relative ${usePostItAesthetic ? `w-[300px] md:w-[440px] shrink-0 rounded-[3rem] p-3 border-2 ${dragOverThemeIdx === i ? 'bg-indigo-50/50 scale-[1.03] border-indigo-400 border-dashed shadow-2xl z-10' : 'bg-transparent border-transparent'}` : `bg-white rounded-[2rem] border overflow-hidden mb-12 last:mb-0 shadow-sm ${dragOverThemeIdx === i ? 'border-indigo-500 ring-8 ring-indigo-500/10 scale-[1.01]' : 'border-slate-200'}`} print:w-full print:break-inside-avoid`}>
                              <div className="p-8 mb-8 border-b-4 border-slate-900/5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Pillar 0{i + 1}</span>
                                  <div className="flex gap-1 print:hidden">
                                    {themeColors.map(c => <button key={c} onClick={() => handleThemeColorChange(i, c)} className={`w-3 h-3 rounded-full ${theme.color === c ? 'ring-2 ring-slate-300 scale-110' : 'opacity-40'}`} style={{ backgroundColor: c === 'yellow' ? '#fde047' : c === 'pink' ? '#f9a8d4' : c === 'green' ? '#86efac' : c === 'blue' ? '#93c5fd' : '#fdba74' }} />)}
                                  </div>
                                </div>
                                <h3 onDoubleClick={() => handleThemeTitleDoubleClick(i, theme.title)} className="font-black text-slate-900 leading-none uppercase tracking-tighter text-3xl md:text-4xl cursor-pointer">{editingTitle?.themeIdx === i ? <input autoFocus value={editTitleText} onChange={e => setEditTitleText(e.target.value)} onBlur={handleThemeTitleSave} className="bg-transparent border-b-2 border-indigo-500 w-full outline-none" /> : theme.title}</h3>
                              </div>
                              <div className="p-8 mb-10 bg-indigo-50/40 rounded-3xl border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-600/40 uppercase tracking-widest mb-3">Insight</p>
                                <p className="text-base md:text-lg font-medium text-slate-800 leading-snug">"{theme.metaInsight}"</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 md:gap-6">
                                {theme.notes.map((note, j) => {
                                  const styles = getNoteStyles(note, j, draggedNote?.themeIdx === i && draggedNote?.noteIdx === j, theme.color);
                                  const isEditing = editingNote?.themeIdx === i && editingNote?.noteIdx === j;
                                  return (
                                    <NoteCard
                                      key={note.id}
                                      note={note}
                                      index={j}
                                      themeIndex={i}
                                      themeColor={theme.color}
                                      isDragging={draggedNote?.themeIdx === i && draggedNote?.noteIdx === j}
                                      isEditing={!!isEditing}
                                      styles={styles}
                                      editText={editText}
                                      onDragStart={(e) => handleDragStart(e, i, j)}
                                      onDragEnd={() => setDraggedNote(null)}
                                      onDoubleClick={(e) => { e.stopPropagation(); handleNoteDoubleClick(i, j, note.text); }}
                                      onChangeText={setEditText}
                                      onSave={handleNoteSave}
                                      onGenerateVideo={(e) => { e.stopPropagation(); handleGenerateVideo(note, i, j); }}
                                      onGenerateImage={(e) => { e.stopPropagation(); handleGenerateImage(note, i, j); }}
                                      onRevert={(e) => { e.stopPropagation(); handleRevertNote(i, j); }}
                                    />
                                  );
                                })}
                                <button onClick={() => handleAddNote(i)} className="aspect-square rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button>
                              </div>
                            </div>
                          ))}
                          {/* Strategic Gaps Render */}
                          <div className="w-[300px] md:w-[380px] shrink-0 bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl">
                            <h3 className="text-3xl font-black uppercase mb-8">Gaps</h3>
                            <div className="space-y-4">{result.strategicGaps?.map((g, i) => <div key={i} className="p-4 bg-white/5 rounded-xl text-sm">{g}</div>)}</div>
                          </div>
                        </div>
                      )}

                      {/* PROCESS MODE RENDER */}
                      {result?.mode === 'process' && result.diagramCode && (
                        <div className="w-full max-w-5xl mx-auto space-y-8">
                          <div className="text-center space-y-2 mb-12">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Process Digitization</span>
                            <h2 className="text-4xl font-black text-slate-900">Workflow Diagram</h2>
                          </div>
                          <MermaidRenderer code={result.diagramCode} />
                        </div>
                      )}

                      {/* WIREFRAME MODE RENDER */}
                      {result?.mode === 'wireframe' && result.wireframeCode && (
                        <div className="w-full max-w-6xl mx-auto space-y-8">
                          <div className="text-center space-y-2 mb-12">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">UI Generation</span>
                            <h2 className="text-4xl font-black text-slate-900">Component Preview</h2>
                          </div>
                          <WireframeRenderer code={result.wireframeCode} />
                        </div>
                      )}

                    </div>
                  </div>
                ) : activeTab === 'code' ? (
                  <div className="max-w-4xl mx-auto bg-slate-900 text-slate-300 rounded-2xl overflow-hidden shadow-2xl m-8 md:m-16 p-8 font-mono text-sm relative">
                    <button
                      onClick={() => navigator.clipboard.writeText(result?.diagramCode || result?.wireframeCode || "")}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest text-white transition-colors"
                    >
                      Copy Code
                    </button>
                    <pre className="whitespace-pre-wrap overflow-x-auto">
                      {result?.mode === 'process' ? result?.diagramCode : result?.wireframeCode}
                    </pre>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl m-8 md:m-16 p-8 md:p-16">
                    <div className="prose prose-slate max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed bg-slate-50 p-8 rounded-2xl border border-slate-100 overflow-x-auto">
                        {result?.rawMarkdown}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom Controls */}
              {activeTab === 'whiteboard' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-white/50 print:hidden">
                  <button onClick={() => handleZoomBtn(-0.1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg></button>
                  <span className="text-[10px] font-bold text-slate-400 w-12 text-center select-none">{zoomLevel}%</span>
                  <button onClick={() => handleZoomBtn(0.1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button>
                  <button onClick={handleResetView} className="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reset</button>
                </div>
              )}

              {/* Executive Priority Side Panel - Responsive Fix */}
              {result?.mode === 'strategy' && (
                <div className={`fixed right-0 top-[73px] bottom-0 w-full md:w-[400px] bg-white border-l border-slate-200 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${showActionPlan ? 'translate-x-0' : 'translate-x-full'}`}>
                  {result.actionPlan && (
                    <div className="p-8 space-y-8">
                      <div className="space-y-2"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Executive Brief</span><h2 className="text-2xl font-black text-slate-900 tracking-tight">Priority Action Plan</h2></div>
                      <div className="space-y-6">
                        {result.actionPlan.priorities.map((priority, i) => (
                          <div key={i} onMouseEnter={() => setHoveredPriorityId(priority.id || `priority-${i}`)} onMouseLeave={() => setHoveredPriorityId(null)} className={`p-6 rounded-2xl border transition-all duration-300 cursor-default group ${priority.type === 'Big Rock' ? 'bg-indigo-50 border-indigo-200 hover:shadow-lg' : 'bg-white border-slate-200 hover:shadow-lg hover:border-green-300'}`}>
                            <div className="flex items-center justify-between mb-3"><span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${priority.type === 'Big Rock' ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700'}`}>{priority.type}</span></div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{priority.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-black/5 pl-3">"{priority.reasoning}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Widget - Responsive Positioning */}
            <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 print:hidden transition-all duration-300 ${isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'} ${showActionPlan ? 'right-6 md:right-[424px]' : 'right-6'}`}>
              {isChatOpen && (
                <div className="w-[calc(100vw-3rem)] md:w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div><h3 className="font-bold text-slate-800">Otter Assistant</h3><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Azure OpenAI</p></div>
                    <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>{msg.text}</div></div>))}
                    <div ref={chatEndRef}></div>
                  </div>
                  <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about your strategy..." className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
                    <button type="submit" disabled={!chatInput.trim() || isChatSending} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                  </form>
                </div>
              )}
              <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-4 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-bold ${isChatOpen ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                {isChatOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg> : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg><span className="pr-1">Discuss</span></>}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Full Screen Video Modal & Error Modal */}
      {
        fullScreenVideo && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setFullScreenVideo(null)}>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="max-w-[90vh] max-h-[90vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}><video src={fullScreenVideo} className="w-full h-full object-contain bg-black" controls autoPlay /></div>
          </div>
        )
      }
      {
        error && (
          <div className="fixed bottom-10 right-10 bg-red-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-5 z-[100] animate-in slide-in-from-right-10 duration-500 print:hidden">
            <div><p className="font-black text-xs uppercase tracking-widest mb-1">Error</p><p className="text-sm font-medium opacity-90">{error}</p></div>
            <button onClick={() => setError(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )
      }
    </div>
  );
};

export default App;
