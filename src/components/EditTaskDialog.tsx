import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useTasks";
import { TaskWithProject } from "@/stores/timeStore";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithProject;
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
}: EditTaskDialogProps) {
  const { updateTask } = useTasks();
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    setName(task.name);
    setDescription(task.description || "");
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateTask(task.id, name.trim(), description.trim() || null);
      toast.success("Task updated");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.project_color }}
                />
                {task.project_name}
              </div>
              {task.completed && (
                <Badge variant="outline" className="gap-1 text-green-500 border-green-500">
                  <Check className="h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

