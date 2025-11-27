import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/tauri";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SessionNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntryId: string;
  onNoteSaved?: () => void;
}

export default function SessionNoteDialog({
  open,
  onOpenChange,
  timeEntryId,
  onNoteSaved,
}: SessionNoteDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) {
      // Skip if empty
      onOpenChange(false);
      onNoteSaved?.();
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("upsert_note", {
        timeEntryId,
        content: note.trim(),
      });
      toast.success("Note saved");
      setNote("");
      onOpenChange(false);
      onNoteSaved?.();
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error("Failed to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setNote("");
    onOpenChange(false);
    onNoteSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Note
          </DialogTitle>
          <DialogDescription>
            Add a note about what you worked on during this session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note">What did you accomplish?</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you worked on, decisions made, or progress achieved..."
              rows={5}
              autoFocus
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

