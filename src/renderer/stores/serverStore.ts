import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Server {
  id: string;
  country: string;
  countryCode?: string;
  city: string;
  ip: string;
  port: number;
  ping: number | null;
  load: number | null;
}

interface ServerStore {
  servers: Server[];
  lastFetched: number | null;
  isLoading: boolean;
  isLoadingLocations: boolean;
  isLoadingPing: boolean;
  pingProgress: { completed: number; total: number };
  error: string | null;

  // Actions
  setServers: (servers: Server[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingLocations: (loading: boolean) => void;
  setLoadingPing: (loading: boolean) => void;
  setPingProgress: (completed: number, total: number) => void;
  updateServerPing: (serverId: string, ping: number | null) => void;
  setError: (error: string | null) => void;
  clearServers: () => void;
  shouldRefetchServers: () => boolean;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useServerStore = create<ServerStore>()(
  persist(
    (set, get) => ({
      servers: [],
      lastFetched: null,
      isLoading: false,
      isLoadingLocations: false,
      isLoadingPing: false,
      pingProgress: { completed: 0, total: 0 },
      error: null,

      setServers: (servers: Server[]) => {
        console.log("🔄 [ServerStore] Setting servers:", {
          count: servers.length,
          timestamp: new Date().toISOString(),
          preview: servers.slice(0, 3).map((s) => ({
            ip: s.ip,
            country: s.country,
            countryCode: s.countryCode,
            city: s.city,
          })),
        });

        set({
          servers,
          lastFetched: Date.now(),
          error: null,
        });
      },

      setLoading: (loading: boolean) => {
        console.log(`⏳ [ServerStore] Setting loading state: ${loading}`);
        set({ isLoading: loading });
      },

      setLoadingLocations: (loading: boolean) => {
        console.log(`🌍 [ServerStore] Setting location loading state: ${loading}`);
        set({ isLoadingLocations: loading });
      },

      setLoadingPing: (loading: boolean) => {
        console.log(`🏓 [ServerStore] Setting ping loading state: ${loading}`);
        set({ isLoadingPing: loading });
      },

      setPingProgress: (completed: number, total: number) => {
        console.log(`📊 [ServerStore] Setting ping progress: ${completed}/${total}`);
        set({ pingProgress: { completed, total } });
      },

      updateServerPing: (serverId: string, ping: number | null) => {
        const { servers } = get();
        const updatedServers = servers.map((server) => (server.id === serverId ? { ...server, ping } : server));

        console.log(`🏓 [ServerStore] Updated ping for server ${serverId}: ${ping}ms`);
        set({ servers: updatedServers });
      },

      setError: (error: string | null) => {
        if (error) {
          console.error("❌ [ServerStore] Setting error:", error);
        } else {
          console.log("✅ [ServerStore] Clearing error");
        }
        set({ error });
      },

      clearServers: () => {
        console.log("🗑️ [ServerStore] Clearing servers");
        set({
          servers: [],
          lastFetched: null,
          error: null,
        });
      },

      shouldRefetchServers: () => {
        const { lastFetched } = get();
        const shouldRefetch = !lastFetched || Date.now() - lastFetched > CACHE_DURATION;

        console.log("🤔 [ServerStore] Should refetch servers?", {
          shouldRefetch,
          lastFetched: lastFetched ? new Date(lastFetched).toISOString() : "never",
          cacheAge: lastFetched ? `${Math.round((Date.now() - lastFetched) / (1000 * 60))} minutes` : "N/A",
          cacheLimit: "24 hours",
        });

        return shouldRefetch;
      },
    }),
    {
      name: "server-store",
      partialize: (state) => ({
        servers: state.servers,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
