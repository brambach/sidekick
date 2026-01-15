"use client";

import { useState, useRef } from "react";
import { ProjectPhaseStepper } from "./project-phase-stepper";
import { UpdatePhaseDialog } from "./update-phase-dialog";
import { SelectPhaseTemplateDialog } from "./select-phase-template-dialog";
import { ManageProjectPhasesDialog } from "./manage-project-phases-dialog";

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

interface ProjectPhaseManagerProps {
  projectId: string;
  isAdmin?: boolean;
}

export function ProjectPhaseManager({
  projectId,
  isAdmin = false,
}: ProjectPhaseManagerProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [managePhasesOpen, setManagePhasesOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePhaseClick = (phase: Phase) => {
    setSelectedPhase(phase);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    // Don't clear selectedPhase immediately to prevent dialog content flash
    setTimeout(() => setSelectedPhase(null), 200);
  };

  const handleApplyTemplate = () => {
    setTemplateDialogOpen(true);
  };

  const handleManagePhases = () => {
    setManagePhasesOpen(true);
  };

  const handleTemplateSuccess = () => {
    // Trigger refetch by changing the key
    setRefreshKey((prev) => prev + 1);
  };

  const handlePhaseUpdate = () => {
    // Trigger refetch when phase is updated
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ProjectPhaseStepper
        key={refreshKey}
        projectId={projectId}
        isAdmin={isAdmin}
        onPhaseClick={isAdmin ? handlePhaseClick : undefined}
        onApplyTemplate={isAdmin ? handleApplyTemplate : undefined}
        onManagePhases={isAdmin ? handleManagePhases : undefined}
      />
      {isAdmin && (
        <>
          <UpdatePhaseDialog
            projectId={projectId}
            phase={selectedPhase}
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            onUpdate={handlePhaseUpdate}
          />
          <SelectPhaseTemplateDialog
            projectId={projectId}
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            onSuccess={handleTemplateSuccess}
          />
          <ManageProjectPhasesDialog
            projectId={projectId}
            open={managePhasesOpen}
            onOpenChange={setManagePhasesOpen}
            onSuccess={handlePhaseUpdate}
          />
        </>
      )}
    </>
  );
}
