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
import { useTasks } from "@/hooks/useTasks";
import { invoke } from "@tauri-apps/api/tauri";
import { ArrowLeft, CloudDownload, ExternalLink, Key, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PaymoProject {
  id: number;
  name: string;
  color: string;
  active: boolean;
}

interface PaymoTask {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  complete: boolean;
}

interface PaymoTaskImport {
  task: PaymoTask;
  project: PaymoProject;
}

type Step = "api-key" | "projects" | "tasks";

interface PaymoImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymoImportDialog({
  open,
  onOpenChange,
}: PaymoImportDialogProps) {
  const { fetchProjects } = useProjects();
  const { fetchTasks } = useTasks();
  
  // Step management
  const [step, setStep] = useState<Step>("api-key");
  
  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Projects state
  const [projects, setProjects] = useState<PaymoProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState<PaymoTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Load saved API key on mount
  useEffect(() => {
    if (open) {
      loadApiKey();
    }
  }, [open]);

  // Determine initial step based on API key
  useEffect(() => {
    if (!isLoadingKey) {
      if (savedApiKey) {
        setStep("projects");
        // Set loading state immediately before async call
        setIsLoadingProjects(true);
        fetchPaymoProjects(savedApiKey);
      } else {
        setStep("api-key");
      }
    }
  }, [savedApiKey, isLoadingKey]);

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
    setSelectedProjectIds(new Set());

    // Allow React to render the loading state before blocking call
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const result = await invoke<PaymoProject[]>("fetch_paymo_projects", { apiKey: key });
      setProjects(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchPaymoTasks = async () => {
    if (selectedProjectIds.size === 0 || !savedApiKey) return;
    
    setIsLoadingTasks(true);
    setError(null);
    setTasks([]);
    setSelectedTaskIds(new Set());

    // Allow React to render the loading state before blocking call
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const projectIds = Array.from(selectedProjectIds);
      const result = await invoke<PaymoTask[]>("fetch_paymo_tasks", { 
        apiKey: savedApiKey,
        projectIds 
      });
      setTasks(result);
      setStep("tasks");
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const toggleProject = (id: number) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleTask = (id: number) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllProjects = () => setSelectedProjectIds(new Set(projects.map((p) => p.id)));
  const clearProjects = () => setSelectedProjectIds(new Set());
  const selectAllTasks = () => setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
  const clearTasks = () => setSelectedTaskIds(new Set());

  const handleImportTasks = async () => {
    const selectedTasks = tasks.filter((t) => selectedTaskIds.has(t.id));
    if (selectedTasks.length === 0) return;

    // Build task imports with project info
    const taskImports: PaymoTaskImport[] = selectedTasks.map((task) => {
      const project = projects.find((p) => p.id === task.project_id)!;
      return { task, project };
    });

    setIsImporting(true);
    try {
      const count = await invoke<number>("import_paymo_tasks", { taskImports });
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

  const handleBack = () => {
    if (step === "tasks") {
      setStep("projects");
      setTasks([]);
      setSelectedTaskIds(new Set());
    }
  };

  const handleClose = () => {
    setProjects([]);
    setSelectedProjectIds(new Set());
    setTasks([]);
    setSelectedTaskIds(new Set());
    setError(null);
    setStep(savedApiKey ? "projects" : "api-key");
    onOpenChange(false);
  };

  const getProjectForTask = (task: PaymoTask) => 
    projects.find((p) => p.id === task.project_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] sm:max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "tasks" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleBack}
                className="mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <CloudDownload className="h-5 w-5" />
            Import from Paymo
          </DialogTitle>
          <DialogDescription>
            {step === "api-key" && "Connect your Paymo account to import projects and tasks."}
            {step === "projects" && "Select projects to browse their tasks."}
            {step === "tasks" && "Select tasks to import into Dormamu."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingKey ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : step === "api-key" ? (
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
        ) : step === "projects" ? (
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
                    setStep("api-key");
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
                    <Button variant="ghost" size="sm" onClick={selectAllProjects}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearProjects}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-[250px] overflow-y-auto space-y-2 border rounded-md p-3">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedProjectIds.has(project.id)}
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
                      setStep("api-key");
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
                  onClick={fetchPaymoTasks}
                  disabled={selectedProjectIds.size === 0 || isLoadingTasks}
                >
                  {isLoadingTasks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Tasks...
                    </>
                  ) : (
                    `Next: Select Tasks (${selectedProjectIds.size})`
                  )}
                </Button>
              </DialogFooter>
            )}
          </div>
        ) : (
          /* Task Selection View */
          <div className="grid gap-4 py-4">
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading tasks...</span>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-destructive text-sm mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Go Back
                </Button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  No incomplete tasks found in selected projects.
                </p>
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Select Different Projects
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {tasks.length} task(s) available
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllTasks}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearTasks}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-[250px] overflow-y-auto space-y-2 border rounded-md p-3">
                  {tasks.map((task) => {
                    const project = getProjectForTask(task);
                    return (
                      <label
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={() => toggleTask(task.id)}
                        />
                        {project && (
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: project.color }}
                            title={project.name}
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{task.name}</span>
                          {project && (
                            <span className="text-xs text-muted-foreground truncate">
                              {project.name}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {!isLoadingTasks && !error && tasks.length > 0 && (
              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImportTasks}
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
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
