interface TicketStatusBadgeProps {
  status: "open" | "in_progress" | "waiting_on_client" | "resolved" | "closed";
  size?: "sm" | "md";
}

const statusStyles = {
  open: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    label: "Open",
  },
  in_progress: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "In Progress",
  },
  waiting_on_client: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "Waiting on Client",
  },
  resolved: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "Resolved",
  },
  closed: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    label: "Closed",
  },
};

export function TicketStatusBadge({ status, size = "sm" }: TicketStatusBadgeProps) {
  const style = statusStyles[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      {style.label}
    </span>
  );
}

interface TicketPriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent";
  size?: "sm" | "md";
}

const priorityStyles = {
  low: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    label: "Low",
  },
  medium: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    label: "Medium",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    label: "High",
  },
  urgent: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    label: "Urgent",
  },
};

export function TicketPriorityBadge({ priority, size = "sm" }: TicketPriorityBadgeProps) {
  const style = priorityStyles[priority];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      {style.label}
    </span>
  );
}

interface TicketTypeBadgeProps {
  type: "general_support" | "project_issue" | "feature_request" | "bug_report";
  size?: "sm" | "md";
}

const typeStyles = {
  general_support: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    label: "Support",
  },
  project_issue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    label: "Project Issue",
  },
  feature_request: {
    bg: "bg-green-50",
    text: "text-green-600",
    label: "Feature Request",
  },
  bug_report: {
    bg: "bg-red-50",
    text: "text-red-600",
    label: "Bug Report",
  },
};

export function TicketTypeBadge({ type, size = "sm" }: TicketTypeBadgeProps) {
  const style = typeStyles[type];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded font-medium ${style.bg} ${style.text} ${sizeClasses}`}>
      {style.label}
    </span>
  );
}
