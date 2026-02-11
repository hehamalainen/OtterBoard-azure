
export interface WhiteboardNote {
  id: string;
  text: string;
  videoUrl?: string; // URL for the generated video
  imageUrl?: string; // URL for the generated image
  color?: string;
  category?: string;
}

export interface StrategicTheme {
  title: string;
  metaInsight: string;
  notes: WhiteboardNote[];
  color?: 'yellow' | 'pink' | 'green' | 'blue' | 'orange';
}

export type PriorityType = 'Big Rock' | 'Quick Win';

export interface StrategicPriority {
  id: string;
  title: string;
  type: PriorityType;
  reasoning: string;
  sourceNoteIds: string[]; // references WhiteboardNote.id
}

export interface StrategicActionPlan {
  priorities: StrategicPriority[];
}

export type AnalysisMode = 'strategy' | 'process' | 'wireframe';

export interface AnalysisResult {
  mode: AnalysisMode;
  themes: StrategicTheme[];
  strategicGaps?: string[];
  actionPlan?: StrategicActionPlan;
  rawMarkdown: string;
  // New fields for visual modes
  diagramCode?: string; // Mermaid.js code
  wireframeCode?: string; // HTML/Tailwind string
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  identityProvider: string;
  roles: string[];
}

export interface AppState {
  images: string[];
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface Board {
  id: string;
  title: string;
  owner: string;
  ownerEmail?: string;
  collaborators: string[];
  updatedAt: string | null;
  result: AnalysisResult | null;
}
