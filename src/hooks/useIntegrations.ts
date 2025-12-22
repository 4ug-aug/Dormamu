import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";

export interface IntegrationState {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
}

export interface IntegrationsState {
  paymo: IntegrationState;
  asana: IntegrationState;
}

const DEFAULT_STATE: IntegrationsState = {
  paymo: {
    id: "paymo",
    name: "Paymo",
    description: "Time tracking and project management",
    enabled: false,
    configured: false,
  },
  asana: {
    id: "asana",
    name: "Asana",
    description: "Task and project management",
    enabled: false,
    configured: false,
  },
};

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationsState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load enabled states
      const paymoEnabled = await invoke<string | null>("get_setting", { key: "paymo_enabled" });
      const asanaEnabled = await invoke<string | null>("get_setting", { key: "asana_enabled" });

      // Load configured states (check if API keys exist)
      const paymoKey = await invoke<string | null>("get_setting", { key: "paymo_api_key" });
      const asanaKey = await invoke<string | null>("get_setting", { key: "asana_api_key" });

      setIntegrations({
        paymo: {
          ...DEFAULT_STATE.paymo,
          enabled: paymoEnabled === "true",
          configured: !!paymoKey,
        },
        asana: {
          ...DEFAULT_STATE.asana,
          enabled: asanaEnabled === "true",
          configured: !!asanaKey,
        },
      });
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const setIntegrationEnabled = useCallback(async (id: string, enabled: boolean) => {
    try {
      await invoke("set_setting", { key: `${id}_enabled`, value: enabled ? "true" : "false" });
      setIntegrations((prev) => ({
        ...prev,
        [id]: {
          ...prev[id as keyof IntegrationsState],
          enabled,
        },
      }));
    } catch (err) {
      console.error(`Failed to update ${id} enabled state:`, err);
      throw err;
    }
  }, []);

  const refreshIntegrations = useCallback(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  return {
    integrations,
    isLoading,
    setIntegrationEnabled,
    refreshIntegrations,
  };
}
