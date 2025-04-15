export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export type TabState = "normal" | "splash";

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
