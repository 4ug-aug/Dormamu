import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  isConfigured: boolean;
  onToggle: (enabled: boolean) => void;
  onConfigure: () => void;
}

export default function IntegrationCard({
  name,
  description,
  icon,
  isEnabled,
  isConfigured,
  onToggle,
  onConfigure,
}: IntegrationCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            aria-label={`Enable ${name}`}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Not configured</span>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onConfigure}>
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
