import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/useProjects";
import { invoke } from "@tauri-apps/api/tauri";
import { CloudDownload, ExternalLink, Key, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PaymoProject {
  id: number;
  name: string;
  color: string;
  active: boolean;
}

interface PaymoImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymoImportDialog({
  open,
  onOpenChange,
}: PaymoImportDialogProps) {
  const { fetchProjects } = useProjects();
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [projects, setProjects] = useState<PaymoProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved API key on mount
  useEffect(() => {
    if (open) {
      loadApiKey();
    }
  }, [open]);

  // Fetch projects when we have an API key
  useEffect(() => {
    if (savedApiKey && open) {
      fetchPaymoProjects(savedApiKey);
    }
  }, [savedApiKey, open]);

  const loadApiKey = async () => {
    setIsLoadingKey(true);
    try {
      const key = await invoke<string | null>("get_setting", { key: "paymo_api_key" });
      if (key) {
        setSavedApiKey(key);
        setApiKey(key);
      }
    } catch (err) {
      console.error("Failed to load API key:", err);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsConnecting(true);
    try {
      await invoke("set_setting", { key: "paymo_api_key", value: apiKey.trim() });
      setSavedApiKey(apiKey.trim());
      toast.success("API key saved");
    } catch (err) {
      toast.error("Failed to save API key");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchPaymoProjects = async (key: string) => {
    setIsLoadingProjects(true);
    setError(null);
    setProjects([]);
    setSelectedIds(new Set());

    try {
      const result = await invoke<PaymoProject[]>("fetch_paymo_projects", { apiKey: key });
      setProjects(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const toggleProject = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(projects.map((p) => p.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    const selectedProjects = projects.filter((p) => selectedIds.has(p.id));
    if (selectedProjects.length === 0) return;

    setIsImporting(true);
    try {
      await invoke("import_paymo_projects", { projects: selectedProjects });
      toast.success(`Imported ${selectedProjects.length} project(s)`);
      fetchProjects(); // Refresh the project list
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to import: ${err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setProjects([]);
    setSelectedIds(new Set());
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] sm:max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className="h-5 w-5" />
            Import from Paymo
          </DialogTitle>
          <DialogDescription>
            Connect your Paymo account to import projects.
          </DialogDescription>
        </DialogHeader>

        {isLoadingKey ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !savedApiKey ? (
          /* API Key Setup View */
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Paymo API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Paymo API key"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://app.paymoapp.com/#Paymo.module.myaccount/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                >
                  Paymo Account Settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={saveApiKey} disabled={!apiKey.trim() || isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Project Selection View */
          <div className="grid gap-4 py-4">
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading projects...</span>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-destructive text-sm mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSavedApiKey(null);
                    setApiKey("");
                  }}
                >
                  Change API Key
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No active projects found in Paymo.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {projects.length} project(s) available
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={selectNone}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-3">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <div
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm truncate">{project.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSavedApiKey(null);
                      setApiKey("");
                    }}
                  >
                    Change API Key
                  </Button>
                </div>
              </>
            )}

            {!isLoadingProjects && !error && projects.length > 0 && (
              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedIds.size === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${selectedIds.size} Project(s)`
                  )}
                </Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
