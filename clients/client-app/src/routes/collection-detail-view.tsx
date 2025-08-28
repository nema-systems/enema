import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { ChevronLeftIcon, CubeTransparentIcon, ListBulletIcon, ShareIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/ui/loading-spinner';
import ErrorMessage from '../components/ui/error-message';
import TabNavigation from '../components/ui/tab-navigation';
import RequirementCreationModal, { RequirementFormData } from '../components/modals/requirement-creation-modal';
import RequirementsGraph from '../components/requirements/requirements-graph';
import SuccessToast from '../components/ui/success-toast';
import { apiUrl } from '../utils/api';

interface ReqCollection {
  id: number;
  workspace_id: number;
  name: string;
  metadata?: any;
  created_at: string;
}

interface Requirement {
  id: number;
  req_collection_id: number;
  public_id: string;
  name: string;
  definition: string;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  version_number: number;
  created_at: string;
}

const CollectionDetailView: React.FC = () => {
  const { workspaceId, collectionId } = useParams<{ workspaceId: string; collectionId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  // State
  const [collection, setCollection] = useState<ReqCollection | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastCreatedRequirement, setLastCreatedRequirement] = useState<Requirement | null>(null);

  const getBgColorFromId = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-cyan-500'
    ];
    return colors[id % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800';
      case 'approved':
        return 'border-green-300 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-300 dark:bg-green-900/20';
      case 'rejected':
        return 'border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-300 dark:bg-red-900/20';
      case 'obsolete':
        return 'border-gray-300 text-gray-500 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-800';
      default:
        return 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-300 dark:bg-red-900/20';
      case 'high':
        return 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:bg-orange-900/20';
      case 'medium':
        return 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:bg-yellow-900/20';
      case 'low':
        return 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800';
      default:
        return 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'L0':
        return 'border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-300 dark:bg-red-900/20';
      case 'L1':
        return 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:bg-orange-900/20';
      case 'L2':
        return 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:bg-yellow-900/20';
      case 'L3':
        return 'border-green-300 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-300 dark:bg-green-900/20';
      case 'L4':
        return 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/20';
      case 'L5':
        return 'border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:bg-purple-900/20';
      default:
        return 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const fetchCollection = async () => {
    if (!workspaceId || !collectionId) return;

    try {
      const token = await getToken({ template: 'default' });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/req_collections/${collectionId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCollection(response.data.data);
    } catch (err: any) {
      console.error('Error fetching collection:', err);
      setError(err.response?.data?.message || 'Failed to fetch collection');
    }
  };

  const fetchRequirements = async () => {
    if (!workspaceId || !collectionId) return;

    try {
      const token = await getToken({ template: 'default' });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements?req_collection_id=${collectionId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequirements(response.data.data?.items || []);
    } catch (err: any) {
      console.error('Error fetching requirements:', err);
      setError(err.response?.data?.message || 'Failed to fetch requirements');
    }
  };

  const handleCreateRequirement = async (formData: RequirementFormData) => {
    if (!workspaceId || !collectionId) return;

    setIsCreating(true);
    
    try {
      const token = await getToken({ template: 'default' });
      
      const payload = {
        req_collection_id: parseInt(collectionId!),
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
      
      console.log('Creating requirement with payload:', payload);
      
      const response = await axios.post(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements`),
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const createdRequirement = response.data.data;
      setRequirements(prev => [createdRequirement, ...prev]);
      
      // Store for success toast
      setLastCreatedRequirement(createdRequirement);
      
      // Close modal and show success
      setIsCreateModalOpen(false);
      setShowSuccessToast(true);
      
    } catch (err: any) {
      console.error('Error creating requirement:', err);
      console.error('API Error Details:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to create requirement';
      alert(`Error creating requirement: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCollection(),
        fetchRequirements()
      ]);
      
      setLoading(false);
    };

    loadData();
  }, [workspaceId, collectionId]);

  const tabs = [
    {
      id: 'list',
      name: 'Requirements',
      icon: ListBulletIcon,
      count: requirements.length
    },
    {
      id: 'graph',
      name: 'Graph View',
      icon: ShareIcon,
      count: undefined
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage
          title="Failed to load collection"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <CubeTransparentIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Collection not found</h3>
          <p className="text-gray-500 dark:text-gray-400">The requested collection could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}/req_collections`)}
          className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Requirement Collections
        </button>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{collection.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`w-1 h-16 ${getBgColorFromId(collection.id)} rounded-full`} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {collection.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Created: {new Date(collection.created_at).toLocaleDateString()}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {requirements.length} requirement{requirements.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Requirement
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="px-6"
        />
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {activeTab === 'list' ? (
          <div className="p-6">
            {requirements.length === 0 ? (
              <div className="text-center py-12">
                <ListBulletIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No requirements yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by adding your first requirement to this collection.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add First Requirement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {requirement.name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {requirement.public_id}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                          {requirement.definition}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(requirement.status)}`}>
                        {requirement.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(requirement.priority)}`}>
                        {requirement.priority}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(requirement.level)}`}>
                        {requirement.level}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:bg-purple-900/20">
                        {requirement.functional}
                      </span>
                    </div>

                    <div className="text-gray-400 dark:text-gray-500 text-xs flex justify-between">
                      <span>Version {requirement.version_number}</span>
                      <span>Created: {new Date(requirement.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <RequirementsGraph 
              requirements={requirements}
              className="border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Requirement Creation Modal */}
      <RequirementCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRequirement}
        isLoading={isCreating}
        reqCollections={collection ? [collection] : []}
        selectedReqCollectionId={collection?.id}
        workspaceId={workspaceId!}
        editRequirement={null}
      />

      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        title="Requirement Created Successfully!"
        message={`"${lastCreatedRequirement?.name}" has been added to ${collection.name}.`}
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

export default CollectionDetailView;