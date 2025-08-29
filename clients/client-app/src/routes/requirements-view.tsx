import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiUrl } from "../utils/api";
import { useGlobalFilter } from "../contexts/global-filter-context";
import RequirementsViews from "../components/requirements/requirements-views";
import RequirementCreationModal, { RequirementFormData } from "../components/modals/requirement-creation-modal";
import SuccessToast from "../components/ui/success-toast";
import LoadingSpinner from "../components/ui/loading-spinner";


interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const RequirementsView = () => {
  const { workspaceId } = useParams();
  const { getToken } = useAuth();
  const { setWorkspace: setGlobalWorkspace } = useGlobalFilter();
  
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastCreatedRequirement, setLastCreatedRequirement] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [refreshRequirements, setRefreshRequirements] = useState<(() => void) | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      setWorkspaceLoading(true);
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const workspaceData = response.data.data;
      setWorkspaceDetails(workspaceData);
      
      // Set workspace in global filter
      setGlobalWorkspace(workspaceId);
    } catch (err: any) {
      console.error("Error fetching workspace:", err);
    } finally {
      setWorkspaceLoading(false);
    }
  };


  const fetchModules = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/modules`),
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: 100, // Use maximum allowed limit
            sort: 'id',
            order: 'asc'
          }
        }
      );
      setModules(response.data.data?.items || []);
    } catch (err: any) {
      console.error("Error fetching modules:", err);
    }
  };
  
  const handleCreateRequirement = async (formData: RequirementFormData) => {
    if (!workspaceId) return;

    setIsCreating(true);
    
    try {
      const token = await getToken({ template: "default" });
      
      const payload = {
        module_id: formData.module_id,
        parent_req_id: formData.parent_req_id,
        name: formData.name,
        definition: formData.definition,
        level: formData.level,
        priority: formData.priority,
        functional: formData.functional,
        validation_method: formData.validation_method,
        status: formData.status,
        rationale: formData.rationale,
        notes: formData.notes,
      };
      
      const response = await axios.post(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements`),
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const requirement = response.data.data;
      
      // Store for success toast
      setLastCreatedRequirement(requirement);
      
      // Close modal and show success
      setIsModalOpen(false);
      setShowSuccessToast(true);
      
      // Refresh the requirements list
      if (refreshRequirements) {
        refreshRequirements();
      }
      
    } catch (err: any) {
      console.error('Error creating requirement:', err);
      console.error('API Error Details:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to create requirement';
      alert(`Error creating requirement: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
      fetchModules();
    }
  }, [workspaceId]);

  if (workspaceLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Requirements</h1>
            {workspaceDetails?.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-1">{workspaceDetails.description}</p>
            )}
          </div>
          <div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Requirements Views */}
      <RequirementsViews 
        workspaceId={workspaceId!}
        standalone={true}
        onRefreshRef={setRefreshRequirements}
      />

      {/* Requirement Creation Modal */}
      <RequirementCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRequirement}
        isLoading={isCreating}
        modules={modules}
        workspaceId={workspaceId!}
      />

      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        title="Requirement Created Successfully!"
        message={`"${lastCreatedRequirement?.name}" has been added to the requirement collection.`}
        createdResources={[
          ...(lastCreatedRequirement ? [{
            type: 'requirement' as const,
            id: lastCreatedRequirement.id,
            name: lastCreatedRequirement.name
          }] : [])
        ]}
      />
    </div>
  );
};

export default RequirementsView;