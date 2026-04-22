import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@paperclipai/shared";
import { projectsApi } from "../api/projects";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToastActions } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { EntityRow } from "../components/EntityRow";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { formatDate, projectUrl } from "../lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hexagon, Plus, MoreHorizontal, Archive, ArchiveRestore } from "lucide-react";

function ProjectStatusSelect({
  projectId,
  currentStatus,
  onStatusChange,
}: {
  projectId: string;
  currentStatus: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => onStatusChange(value as ProjectStatus)}
    >
      <SelectTrigger size="sm" className="h-7 w-auto min-w-[100px] border-0 shadow-none p-1 pr-6 focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {status.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProjectRow({
  project,
  onStatusChange,
  onArchive,
}: {
  project: Project;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onArchive: (id: string, archived: boolean) => void;
}) {
  const workspaceCount = project.workspaces?.length ?? 0;
  const isArchived = !!project.archivedAt;

  return (
    <EntityRow
      key={project.id}
      title={project.name}
      subtitle={project.description ?? undefined}
      to={projectUrl(project)}
      leading={
        project.color ? (
          <span
            className="inline-block h-3 w-3 rounded-sm shrink-0"
            style={{ backgroundColor: project.color }}
          />
        ) : undefined
      }
      trailing={
        <div className="flex items-center gap-3">
          {project.targetDate && (
            <span className="text-xs text-muted-foreground">
              {formatDate(project.targetDate)}
            </span>
          )}
          {workspaceCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {workspaceCount} {workspaceCount === 1 ? "workspace" : "workspaces"}
            </span>
          )}
          <ProjectStatusSelect
            projectId={project.id}
            currentStatus={project.status}
            onStatusChange={(status) => onStatusChange(project.id, status)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onArchive(project.id, !isArchived)}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  );
}

export function Projects() {
  const { selectedCompanyId } = useCompany();
  const { openNewProject } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToastActions();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Projects" }]);
  }, [setBreadcrumbs]);

  const { data: allProjects, isLoading, error } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const projects = useMemo(
    () => (allProjects ?? []).filter((p) => !p.archivedAt),
    [allProjects],
  );

  const archivedProjects = useMemo(
    () => (allProjects ?? []).filter((p) => p.archivedAt),
    [allProjects],
  );

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      projectsApi.update(id, data, selectedCompanyId),
    onSuccess: () => {
      if (selectedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(selectedCompanyId) });
      }
    },
    onError: () => {
      pushToast({ title: "Failed to update project", tone: "error" });
    },
  });

  const handleStatusChange = (projectId: string, status: ProjectStatus) => {
    updateProject.mutate({ id: projectId, data: { status } });
  };

  const handleArchive = (projectId: string, archived: boolean) => {
    updateProject.mutate({
      id: projectId,
      data: { archivedAt: archived ? new Date().toISOString() : null },
    });
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={Hexagon} message="Select a company to view projects." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={openNewProject}>
          <Plus className="h-4 w-4 mr-1" />
          Add Project
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!isLoading && projects.length === 0 && archivedProjects.length === 0 && (
        <EmptyState
          icon={Hexagon}
          message="No projects yet."
          action="Add Project"
          onAction={openNewProject}
        />
      )}

      {projects.length > 0 && (
        <div className="border border-border">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onStatusChange={handleStatusChange}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {archivedProjects.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground pt-2">
            Archived ({archivedProjects.length})
          </h3>
          <div className="border border-border">
            {archivedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onStatusChange={handleStatusChange}
                onArchive={handleArchive}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}