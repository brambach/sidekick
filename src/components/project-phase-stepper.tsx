"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  orderIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface ProjectPhaseStepperProps {
  projectId: string;
  isAdmin?: boolean;
  onPhaseClick?: (phase: Phase) => void;
  onApplyTemplate?: () => void;
  onManagePhases?: () => void;
}

export function ProjectPhaseStepper({
  projectId,
  isAdmin = false,
  onPhaseClick,
  onApplyTemplate,
  onManagePhases,
}: ProjectPhaseStepperProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/phases`);
      if (response.ok) {
        const data = await response.json();
        setPhases(data);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-slate-600 font-medium mb-2">No phases configured for this project</p>
        {isAdmin ? (
          <>
            <p className="text-xs text-slate-400 mb-4">
              Apply a phase template to track project progress
            </p>
            <Button
              onClick={onApplyTemplate}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Layers className="w-4 h-4 mr-2" />
              Apply Phase Template
            </Button>
          </>
        ) : (
          <p className="text-xs text-slate-400 mt-2">
            Your project phases will appear here once configured
          </p>
        )}
      </div>
    );
  }

  const currentPhaseIndex = phases.findIndex(
    (p) => p.status === "in_progress"
  );
  const hasCurrentPhase = currentPhaseIndex !== -1;

  return (
    <TooltipProvider>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm relative">
        {/* Manage Phases Button */}
        {isAdmin && phases.length > 0 && onManagePhases && (
          <div className="flex justify-end px-8 pt-4 pb-2">
            <Button
              onClick={onManagePhases}
              size="sm"
              variant="outline"
              className="text-purple-600 border-purple-200 hover:bg-purple-50 whitespace-nowrap"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Phases
            </Button>
          </div>
        )}

        <div className={cn(
          "px-8",
          isAdmin && phases.length > 0 && onManagePhases ? "pb-8 pt-2" : "py-8"
        )}>
          {/* Desktop View - Horizontal */}
          <div className="hidden lg:block">
            <div className="relative">
          <div className="flex items-start justify-between gap-4 relative">
            {phases.map((phase, index) => {
            const isCompleted = phase.status === "completed";
            const isCurrent = phase.status === "in_progress";
            const isSkipped = phase.status === "skipped";
            const isPending = phase.status === "pending";
            const isLast = index === phases.length - 1;

            return (
              <div
                key={phase.id}
                className="flex-1 flex flex-col items-center relative"
                style={{
                  animation: `animationIn 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                {/* Connecting Line */}
                {!isLast && (
                  <div className="absolute left-[calc(50%+20px)] top-5 right-0 h-0.5 -z-10" style={{ width: 'calc(100% - 20px)' }}>
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        isCompleted
                          ? "bg-gradient-to-r from-purple-500 to-purple-600"
                          : isPending || isCurrent
                          ? "border-t-2 border-dashed border-slate-200"
                          : "bg-slate-200"
                      )}
                    />
                  </div>
                )}

                {/* Phase Node with Tooltip */}
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isAdmin && onPhaseClick?.(phase)}
                      disabled={!isAdmin}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 shrink-0",
                        isCompleted &&
                          "bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]",
                        isCurrent &&
                          "ring-2 ring-purple-600 bg-white text-purple-600 animate-pulse-glow",
                        isSkipped &&
                          "bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300",
                        isPending && "bg-slate-100 text-slate-400 border-2 border-slate-200",
                        isAdmin && "hover:scale-110 cursor-pointer",
                        !isAdmin && "cursor-default"
                      )}
                    >
                      {isCompleted && <Check className="w-5 h-5" strokeWidth={3} />}
                      {isCurrent && <Circle className="w-4 h-4 fill-purple-600" />}
                      {(isPending || isSkipped) && (
                        <span className="text-xs font-semibold">{index + 1}</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isAdmin && (
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <div className="space-y-2">
                        <p className="font-semibold">{phase.name}</p>
                        {phase.description && (
                          <p className="text-slate-300 text-xs">{phase.description}</p>
                        )}
                        <div className="space-y-1 text-[10px] text-slate-300">
                          <p>Status: {phase.status.replace("_", " ")}</p>
                          {phase.startedAt && (
                            <p>Started: {new Date(phase.startedAt).toLocaleDateString()}</p>
                          )}
                          {phase.notes && <p className="italic">{phase.notes}</p>}
                        </div>
                        <p className="text-[10px] text-purple-300 mt-2">
                          Click to update
                        </p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Phase Name */}
                <div className="mt-3 text-center w-full px-2">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors leading-tight",
                      isCompleted && "text-purple-600",
                      isCurrent && "text-purple-700 font-semibold text-sm",
                      isSkipped && "text-slate-400 line-through",
                      isPending && "text-slate-500"
                    )}
                  >
                    {phase.name}
                  </p>
                  {phase.completedAt && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Completed {formatDistanceToNow(new Date(phase.completedAt))} ago
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
            </div>
          </div>

          {/* Mobile/Tablet View - Vertical */}
          <div className="lg:hidden space-y-4">
        {phases.map((phase, index) => {
          const isCompleted = phase.status === "completed";
          const isCurrent = phase.status === "in_progress";
          const isSkipped = phase.status === "skipped";
          const isPending = phase.status === "pending";
          const isLast = index === phases.length - 1;

          return (
            <div
              key={phase.id}
              className="flex items-start gap-4"
              style={{
                animation: `animationIn 0.5s ease-out ${index * 0.1}s both`,
              }}
            >
              {/* Node + Connector */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isAdmin && onPhaseClick?.(phase)}
                  disabled={!isAdmin}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                    isCompleted &&
                      "bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]",
                    isCurrent &&
                      "ring-2 ring-purple-600 bg-white text-purple-600 animate-pulse-glow",
                    isSkipped &&
                      "bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300",
                    isPending && "bg-slate-100 text-slate-400 border-2 border-slate-200",
                    isAdmin && "active:scale-95",
                    !isAdmin && "cursor-default"
                  )}
                >
                  {isCompleted && <Check className="w-5 h-5" strokeWidth={3} />}
                  {isCurrent && <Circle className="w-4 h-4 fill-purple-600" />}
                  {(isPending || isSkipped) && (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Vertical Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-16 mt-2 transition-all duration-500",
                      isCompleted
                        ? "bg-gradient-to-b from-purple-500 to-purple-600"
                        : "bg-slate-200"
                    )}
                  />
                )}
              </div>

              {/* Phase Info */}
              <div className="flex-1 pt-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-purple-600",
                    isCurrent && "text-purple-700 font-semibold",
                    isSkipped && "text-slate-400 line-through",
                    isPending && "text-slate-600"
                  )}
                >
                  {phase.name}
                </p>
                {phase.description && (
                  <p className="text-xs text-slate-500 mt-1">{phase.description}</p>
                )}
                {phase.completedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    Completed {formatDistanceToNow(new Date(phase.completedAt))} ago
                  </p>
                )}
                {phase.notes && (
                  <p className="text-xs text-slate-500 mt-2 italic">{phase.notes}</p>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>

        {/* Add CSS for pulse glow animation */}
        <style jsx>{`
          @keyframes pulse-glow {
            0%,
            100% {
              box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 25px rgba(139, 92, 246, 0.6);
            }
          }
          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
