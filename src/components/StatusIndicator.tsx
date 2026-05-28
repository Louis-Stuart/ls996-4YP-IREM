import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface StatusIndicatorProps {
  status: "connected" | "loading" | "error" | "mock";
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = {
    connected: { icon: Wifi, label: "API Connected", className: "text-emission-low" },
    loading: { icon: Loader2, label: "Loading…", className: "text-muted-foreground animate-spin" },
    error: { icon: WifiOff, label: "API Error", className: "text-destructive" },
    mock: { icon: Wifi, label: "Mock Data", className: "text-emission-medium" },
  }[status];

  const Icon = config.icon;

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 ${config.className}`} />
      <span className="text-muted-foreground">{config.label}</span>
    </span>
  );
}
