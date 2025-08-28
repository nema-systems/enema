import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Requirement } from "../types/requirement";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";
import { SuccessToast } from "../components/ui/success-toast";
import axios from "axios";
import { apiUrl } from "../utils/api";

interface Requirement {
  id: number;
  public_id?: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  req_type: string;
  created_at: string;
  updated_at?: string;
}

const RequirementDetail = () => {
  const { workspaceId, requirementId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    priority: '',
    req_type: ''
  });

  const fetchRequirement = async () => {
    if (!workspaceId || !requirementId) return;
    
    try {
      setLoading(true);
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements/${requirementId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setRequirement(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching requirement:", err);
      setError(err.response?.data?.message || "Failed to fetch requirement");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequirement = async (updates: Partial<Requirement>) => {
    if (!workspaceId || !requirementId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.put(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements/${requirementId}`),
        updates,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
      
      // Update local state
      setRequirement(response.data.data);
      
      setSuccessMessage("Requirement updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error("Error updating requirement:", err);
      alert(err.response?.data?.message || "Failed to update requirement");
    }
  };

  const handleDeleteRequirement = async () => {
    if (!workspaceId || !requirementId) return;
    
    try {
      const token = await getToken({ template: "default" });
      await axios.delete(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements/${requirementId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Redirect to requirements list
      navigate(`/workspace/${workspaceId}/requirements`);
    } catch (err: any) {
      console.error("Error deleting requirement:", err);
      alert(err.response?.data?.message || "Failed to delete requirement");
    }
  };

  useEffect(() => {
    fetchRequirement();
  }, [workspaceId, requirementId]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorMessage 
            title="Failed to load requirement"
            message={error || "Requirement not found"}
            onRetry={fetchRequirement}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/requirements`)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to Requirements
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {requirement.public_id || requirement.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(requirement.status)}`}>
                      {requirement.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(requirement.priority)}`}>
                      {requirement.priority}
                    </span>
                    <span className="text-xs text-gray-500">
                      {requirement.req_type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <OrganizationSwitcher 
                  hidePersonal={false}
                  appearance={{
                    elements: {
                      organizationSwitcherTrigger: "px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md"
                    }
                  }}
                />
                {!editing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteRequirement}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateRequirement}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            {editing ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="REVIEW">Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={editForm.priority}
                      onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="req_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      id="req_type"
                      value={editForm.req_type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, req_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="NON_FUNCTIONAL">Non-Functional</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3">Description</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700">
                      {requirement.description || "No description provided."}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Details</h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID</dt>
                      <dd className="text-sm text-gray-900">{requirement.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Public ID</dt>
                      <dd className="text-sm text-gray-900">{requirement.public_id || "Not assigned"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{new Date(requirement.created_at).toLocaleString()}</dd>
                    </div>
                    {requirement.updated_at && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="text-sm text-gray-900">{new Date(requirement.updated_at).toLocaleString()}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequirementDetail;