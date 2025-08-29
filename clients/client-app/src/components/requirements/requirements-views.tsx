import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { 
  ListBulletIcon, 
  RectangleStackIcon, 
  ShareIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import axios from "axios";
import { apiUrl } from "../../utils/api";
import LoadingSpinner from "../ui/loading-spinner";
import ErrorMessage from "../ui/error-message";

// Import the existing graph component
import RequirementsGraph from "./requirements-graph";

interface Requirement {
  id: number;
  base_req_id?: number;
  parent_req_id?: number;
  prev_version?: number;
  module_id: number;
  author_id: number;
  owner_id?: number;
  public_id: string;
  name: string;
  definition: string;
  version_number: number;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  meta_data?: any;
  created_at: string;
  // Relationships
  module?: {
    id: number;
    name: string;
    public_id: string;
  };
  author?: {
    id: number;
    name: string;
    email: string;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  parent_req?: Requirement;
  children?: Requirement[];
}

type ViewType = 'list' | 'tree' | 'graph';

interface RequirementsViewsProps {
  workspaceId: string;
  moduleId?: number; // Optional - if provided, filter by module
  productId?: number; // Optional - if provided, filter by product modules
  className?: string;
}

const RequirementsViews = ({ 
  workspaceId, 
  moduleId, 
  productId, 
  className = "" 
}: RequirementsViewsProps) => {
  const { getToken } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [functionalFilter, setFunctionalFilter] = useState<string>("all");
  
  // Tree view state
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Fetch requirements
  const fetchRequirements = async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken({ template: "default" });
      const params = new URLSearchParams();
      
      // Add filters
      if (moduleId) params.append('component_id', moduleId.toString());
      if (productId) params.append('product_id', productId.toString());
      if (statusFilter !== "all") params.append('status', statusFilter);
      if (priorityFilter !== "all") params.append('priority', priorityFilter);
      if (levelFilter !== "all") params.append('level', levelFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
      // Set large limit to get all requirements for tree/graph views
      params.append('limit', '1000');

      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements?${params}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const reqData = response.data.data?.items || response.data.data || [];
      setRequirements(reqData);
    } catch (err: any) {
      console.error("Error fetching requirements:", err);
      setError(err.response?.data?.message || "Failed to fetch requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [workspaceId, moduleId, productId, statusFilter, priorityFilter, levelFilter, searchQuery]);

  // Build hierarchical structure for tree view
  const hierarchicalRequirements = useMemo(() => {
    const reqMap = new Map<number, Requirement & { children: Requirement[] }>();
    const roots: (Requirement & { children: Requirement[] })[] = [];

    // First pass: create map with children arrays
    requirements.forEach(req => {
      reqMap.set(req.id, { ...req, children: [] });
    });

    // Second pass: build hierarchy
    requirements.forEach(req => {
      const reqWithChildren = reqMap.get(req.id)!;
      if (req.parent_req_id && reqMap.has(req.parent_req_id)) {
        reqMap.get(req.parent_req_id)!.children.push(reqWithChildren);
      } else {
        roots.push(reqWithChildren);
      }
    });

    return roots;
  }, [requirements]);

  // Filter requirements for list view
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      if (functionalFilter !== "all" && req.functional !== functionalFilter) return false;
      return true;
    });
  }, [requirements, functionalFilter]);

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-700 bg-green-100';
      case 'draft': return 'text-yellow-700 bg-yellow-100';
      case 'rejected': return 'text-red-700 bg-red-100';
      case 'obsolete': return 'text-gray-700 bg-gray-100';
      default: return 'text-blue-700 bg-blue-100';
    }
  };

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (req: Requirement & { children: Requirement[] }, depth: number = 0) => {
    const hasChildren = req.children.length > 0;
    const isExpanded = expandedNodes.has(req.id);

    return (
      <div key={req.id} className="border-l-2 border-gray-200 dark:border-gray-700">
        <div 
          className={`flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
          onClick={() => hasChildren && toggleNode(req.id)}
        >
          <div className="flex items-center mr-3">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )
            ) : (
              <div className="h-4 w-4" /> // Spacer
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {req.public_id}
                </h4>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(req.priority)}`}>
                  {req.priority}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                  {req.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {req.level}
              </div>
            </div>
            
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              {req.name}
            </p>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {req.definition}
            </p>

            {req.module && (
              <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400">
                <span>Module: {req.module.name}</span>
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {req.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-2">
      {filteredRequirements.map((req) => (
        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {req.public_id}
              </h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(req.priority)}`}>
                {req.priority}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                {req.status}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {req.level}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              v{req.version_number}
            </div>
          </div>
          
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {req.name}
          </h4>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
            {req.definition}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              {req.module && (
                <span className="text-blue-600 dark:text-blue-400">
                  Module: {req.module.name}
                </span>
              )}
              <span>
                {req.functional}
              </span>
              <span>
                {req.validation_method}
              </span>
            </div>
            <div>
              Created: {new Date(req.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTreeView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {hierarchicalRequirements.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No requirements found
        </div>
      ) : (
        <div>
          {hierarchicalRequirements.map(req => renderTreeNode(req))}
        </div>
      )}
    </div>
  );

  const renderGraphView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-96">
      <RequirementsGraph requirements={requirements} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        title="Failed to load requirements"
        message={error}
        onRetry={fetchRequirements}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with view toggle and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setCurrentView('list')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ListBulletIcon className="h-4 w-4 mr-2" />
            List
          </button>
          <button
            onClick={() => setCurrentView('tree')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'tree'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <RectangleStackIcon className="h-4 w-4 mr-2" />
            Tree
          </button>
          <button
            onClick={() => setCurrentView('graph')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'graph'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            Graph
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="obsolete">Obsolete</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        >
          <option value="all">All Levels</option>
          <option value="L0">L0</option>
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
          <option value="L4">L4</option>
          <option value="L5">L5</option>
        </select>

        <select
          value={functionalFilter}
          onChange={(e) => setFunctionalFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        >
          <option value="all">All Types</option>
          <option value="functional">Functional</option>
          <option value="non_functional">Non-Functional</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {filteredRequirements.length} requirement{filteredRequirements.length !== 1 ? 's' : ''} found
      </div>

      {/* Content based on current view */}
      {currentView === 'list' && renderListView()}
      {currentView === 'tree' && renderTreeView()}
      {currentView === 'graph' && renderGraphView()}
    </div>
  );
};

export default RequirementsViews;