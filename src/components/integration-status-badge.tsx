import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface IntegrationStatusBadgeProps {
  status: "healthy" | "degraded" | "down" | "unknown";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function IntegrationStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: IntegrationStatusBadgeProps) {
  const config = {
    healthy: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      label: "Healthy",
      icon: CheckCircle,
      iconColor: "text-emerald-600",
    },
    degraded: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      label: "Degraded",
      icon: AlertTriangle,
      iconColor: "text-orange-600",
    },
    down: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      label: "Down",
      icon: XCircle,
      iconColor: "text-red-600",
    },
    unknown: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      label: "Unknown",
      icon: HelpCircle,
      iconColor: "text-slate-500",
    },
  };

  const { bg, text, border, label, icon: Icon, iconColor } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border shadow-sm uppercase tracking-wider whitespace-nowrap",
        bg,
        text,
        border,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm"
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconColor,
            size === "sm" && "w-3 h-3",
            size === "md" && "w-3.5 h-3.5",
            size === "lg" && "w-4 h-4"
          )}
        />
      )}
      {label}
    </span>
  );
}
