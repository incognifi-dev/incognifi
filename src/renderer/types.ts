export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  visitedAt: Date;
  visitCount: number;
}

export type TabState = "normal" | "splash" | "history";

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  state: TabState;
}
