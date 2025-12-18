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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { invoke } from "@tauri-apps/api/tauri";
import { ExternalLink, Key, Loader2, Projector, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AsanaWorkspace {
  gid: string;
  name: string;
}

interface AsanaProject {
  gid: string;
  name: string;
  color: string | null;
}

interface AsanaTask {
  gid: string;
  name: string;
  notes: string | null;
  completed: boolean;
  projects: AsanaProject[] | null;
}

interface AsanaTaskImport {
  task: AsanaTask;
  project_name: string;
  project_color: string | null;
}

type Step = "api-key" | "workspace" | "tasks";

interface AsanaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AsanaImportDialog({
  open,
  onOpenChange,
}: AsanaImportDialogProps) {
  const { fetchProjects } = useProjects();
  const { fetchTasks } = useTasks();

  const [step, setStep] = useState<Step>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const [workspaces, setWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  const [tasks, setTasks] = useState<AsanaTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadApiKey();
    }
  }, [open]);

  useEffect(() => {
    if (!isLoadingKey && savedApiKey) {
      setStep("workspace");
      fetchWorkspaces(savedApiKey);
    }
  }, [savedApiKey, isLoadingKey]);

  const loadApiKey = async () => {
    setIsLoadingKey(true);
    try {
      const key = await invoke<string | null>("get_setting", { key: "asana_api_key" });
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
    setError(null);
    try {
      // Validate by fetching workspaces
      const ws = await invoke<AsanaWorkspace[]>("fetch_asana_workspaces", { apiKey: apiKey.trim() });
      
      await invoke("set_setting", { key: "asana_api_key", value: apiKey.trim() });
      setSavedApiKey(apiKey.trim());
      setWorkspaces(ws);
      setStep("workspace");
      toast.success("Connected to Asana");
    } catch (err) {
      setError(err as string);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchWorkspaces = async (key: string) => {
    setIsLoadingWorkspaces(true);
    setError(null);
    try {
      const ws = await invoke<AsanaWorkspace[]>("fetch_asana_workspaces", { apiKey: key });
      setWorkspaces(ws);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const fetchTasks_internal = async () => {
    if (!selectedWorkspace || !savedApiKey) return;

    setIsLoadingTasks(true);
    setError(null);
    setTasks([]);
    setSelectedTaskIds(new Set());

    try {
      const result = await invoke<AsanaTask[]>("fetch_asana_tasks", {
        apiKey: savedApiKey,
        workspaceId: selectedWorkspace,
      });
      setTasks(result);
      setStep("tasks");
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const toggleTask = (gid: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) {
        next.delete(gid);
      } else {
        next.add(gid);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedTaskIds(new Set(filteredTasks.map((t) => t.gid)));
  const clearSelection = () => setSelectedTaskIds(new Set());

  // Filter tasks by search query
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const projectName = task.projects?.[0]?.name || "";
    return (
      task.name.toLowerCase().includes(query) ||
      projectName.toLowerCase().includes(query)
    );
  });

  const handleImport = async () => {
    const selectedTasks = tasks.filter((t) => selectedTaskIds.has(t.gid));
    if (selectedTasks.length === 0) return;

    // Build import data
    const taskImports: AsanaTaskImport[] = selectedTasks.map((task) => {
      const project = task.projects?.[0];
      return {
        task,
        project_name: project?.name || "Asana Tasks",
        project_color: project?.color || null,
      };
    });

    setIsImporting(true);
    try {
      const count = await invoke<number>("import_asana_tasks", { taskImports });
      toast.success(`Imported ${count} task(s)`);
      fetchProjects();
      fetchTasks();
      handleClose();
    } catch (err) {
      toast.error(`Failed to import: ${err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setWorkspaces([]);
    setTasks([]);
    setSelectedTaskIds(new Set());
    setSelectedWorkspace("");
    setError(null);
    setStep(savedApiKey ? "workspace" : "api-key");
    onOpenChange(false);
  };

  const getProjectName = (task: AsanaTask) => task.projects?.[0]?.name || "No project";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] sm:max-h-[400px] md:max-w-[600px] md:max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Projector className="h-5 w-5" />
            Import from Asana
          </DialogTitle>
          <DialogDescription>
            {step === "api-key" && "Connect your Asana account to import tasks."}
            {step === "workspace" && "Select a workspace to load your tasks."}
            {step === "tasks" && "Select tasks assigned to you to import."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingKey ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : step === "api-key" ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="asana-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Asana Personal Access Token
              </Label>
              <Input
                id="asana-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Asana PAT"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Get your token from{" "}
                <a
                  href="https://app.asana.com/0/my-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                >
                  Asana Developer Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
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
        ) : step === "workspace" ? (
          <div className="grid gap-4 py-4">
            {isLoadingWorkspaces ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                    setStep("api-key");
                  }}
                >
                  Change Token
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Select Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.gid} value={ws.gid}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSavedApiKey(null);
                      setApiKey("");
                      setStep("api-key");
                    }}
                  >
                    Change Token
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                  <Button
                    onClick={fetchTasks_internal}
                    disabled={!selectedWorkspace || isLoadingTasks}
                  >
                    {isLoadingTasks ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load My Tasks"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {error ? (
              <div className="text-center py-4">
                <p className="text-destructive text-sm mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setStep("workspace")}>
                  Go Back
                </Button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  No incomplete tasks assigned to you.
                </p>
                <Button variant="outline" size="sm" onClick={() => setStep("workspace")}>
                  Select Different Workspace
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {filteredTasks.length === tasks.length
                      ? `${tasks.length} task(s)`
                      : `${filteredTasks.length} of ${tasks.length} task(s)`}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks or projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[35vh] overflow-y-auto space-y-2 border rounded-md p-3">
                  {filteredTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      No tasks match "{searchQuery}"
                    </p>
                  ) : (
                    filteredTasks.map((task) => (
                      <label
                        key={task.gid}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTaskIds.has(task.gid)}
                          onCheckedChange={() => toggleTask(task.gid)}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{task.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {getProjectName(task)}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedTaskIds.size === 0 || isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      `Import ${selectedTaskIds.size} Task(s)`
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
