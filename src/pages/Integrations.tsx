import AsanaImportDialog from "@/components/AsanaImportDialog";
import IntegrationCard from "@/components/IntegrationCard";
import PaymoImportDialog from "@/components/PaymoImportDialog";
import { useIntegrations } from "@/hooks/useIntegrations";
import { CloudCog, Loader2, Trello } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Integrations() {
  const { integrations, isLoading, setIntegrationEnabled, refreshIntegrations } = useIntegrations();
  const [paymoDialogOpen, setPaymoDialogOpen] = useState(false);
  const [asanaDialogOpen, setAsanaDialogOpen] = useState(false);

  const handlePaymoToggle = async (enabled: boolean) => {
    try {
      await setIntegrationEnabled("paymo", enabled);
      toast.success(`Paymo integration ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update Paymo integration");
    }
  };

  const handleAsanaToggle = async (enabled: boolean) => {
    try {
      await setIntegrationEnabled("asana", enabled);
      toast.success(`Asana integration ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update Asana integration");
    }
  };

  const handlePaymoConfigureClose = (open: boolean) => {
    setPaymoDialogOpen(open);
    if (!open) {
      refreshIntegrations();
    }
  };

  const handleAsanaConfigureClose = (open: boolean) => {
    setAsanaDialogOpen(open);
    if (!open) {
      refreshIntegrations();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Manage your external service connections
        </p>
      </div>

      <div className="space-y-4">
        <IntegrationCard
          name={integrations.paymo.name}
          description={integrations.paymo.description}
          icon={<CloudCog className="h-5 w-5" />}
          isEnabled={integrations.paymo.enabled}
          isConfigured={integrations.paymo.configured}
          onToggle={handlePaymoToggle}
          onConfigure={() => setPaymoDialogOpen(true)}
        />

        <IntegrationCard
          name={integrations.asana.name}
          description={integrations.asana.description}
          icon={<Trello className="h-5 w-5" />}
          isEnabled={integrations.asana.enabled}
          isConfigured={integrations.asana.configured}
          onToggle={handleAsanaToggle}
          onConfigure={() => setAsanaDialogOpen(true)}
        />
      </div>

      <PaymoImportDialog
        open={paymoDialogOpen}
        onOpenChange={handlePaymoConfigureClose}
      />
      <AsanaImportDialog
        open={asanaDialogOpen}
        onOpenChange={handleAsanaConfigureClose}
      />
    </div>
  );
}
