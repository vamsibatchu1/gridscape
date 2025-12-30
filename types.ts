
export interface Point {
  x: number;
  y: number;
}

export interface QuadrantLabels {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IdeaVersion {
  text: string;
  asciiArt?: string;
  bridgeText?: string;
  terms?: string[];
}

export interface Idea extends Rect {
  id: number;
  text: string;
  asciiArt?: string;
  bridgeText?: string;
  terms: string[];
  versions: IdeaVersion[];
  currentVersionIndex: number;
  isLoading: boolean;
  isAsciiLoading: boolean;
  error: string | null;
  isCollapsed: boolean;
}

export interface Suggestion extends Rect {
  id: string;
  sourceId: number;
  text: string;
}
