import { create } from "zustand";

interface Server {
  id: string;
  country: string;
  countryCode?: string;
  city: string;
  ip: string;
  port: number;
  ping: number | null;
  isHealthy: boolean;
  lastChecked: number;
  type: string;
}

interface VPNState {
  isConnected: boolean;
  signalStrength: number;
  currentServer: Server;
}

interface VPNStore {
  vpnState: VPNState;
  setVpnState: (state: Partial<VPNState>) => void;
  setCurrentServer: (server: Server) => void;
  setConnectionStatus: (isConnected: boolean) => void;
}

const INITIAL_SERVER: Server = {
  id: "custom_1",
  country: "N/A",
  countryCode: undefined,
  city: "N/A",
  ip: "127.0.0.1",
  port: 8080,
  ping: null,
  isHealthy: true,
  lastChecked: Date.now(),
  type: "http",
};

const INITIAL_VPN_STATE: VPNState = {
  isConnected: false,
  signalStrength: 85,
  currentServer: INITIAL_SERVER,
};

export const useVPNStore = create<VPNStore>()((set, get) => ({
  vpnState: INITIAL_VPN_STATE,

  setVpnState: (newState: Partial<VPNState>) => {
    const currentState = get().vpnState;
    set({
      vpnState: { ...currentState, ...newState },
    });
  },

  setCurrentServer: (server: Server) => {
    const currentVpnState = get().vpnState;
    set({
      vpnState: { ...currentVpnState, currentServer: server },
    });
  },

  setConnectionStatus: (isConnected: boolean) => {
    const currentVpnState = get().vpnState;
    set({
      vpnState: { ...currentVpnState, isConnected },
    });
  },
}));
