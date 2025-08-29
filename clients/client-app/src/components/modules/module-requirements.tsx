import RequirementsViews from "../requirements/requirements-views";

interface ModuleRequirementsProps {
  workspaceId: string;
  moduleId: number;
  className?: string;
}

const ModuleRequirements = ({ 
  workspaceId, 
  moduleId, 
  className = "" 
}: ModuleRequirementsProps) => {
  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Module Requirements
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage requirements for this module in different formats.
        </p>
      </div>
      
      <RequirementsViews 
        workspaceId={workspaceId}
        moduleId={moduleId}
      />
    </div>
  );
};

export default ModuleRequirements;