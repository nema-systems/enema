import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  Position,
} from 'reactflow';
import dagre from 'dagre';

import 'reactflow/dist/style.css';

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

// Custom Node Component
const RequirementNode = ({ data }: { data: any }) => {
  const getNodeColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      case 'obsolete':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'L0':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'L1':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'L2':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'L3':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'L4':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'L5':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 ${getNodeColor(data.priority)} dark:border-opacity-50`} style={{ width: 280, minHeight: 120 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusIndicatorColor(data.status)}`} />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {data.public_id}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          data.priority?.toLowerCase() === 'critical' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
          data.priority?.toLowerCase() === 'high' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
          data.priority?.toLowerCase() === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
          'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }`}>
          {data.priority}
        </span>
      </div>
      
      <div className="mb-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
          {data.name}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
          {data.definition}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        <span className={`px-2 py-1 rounded font-medium ${getLevelColor(data.level)}`}>
          {data.level}
        </span>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
          {data.functional}
        </span>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
};

// Node types
const nodeTypes = {
  requirement: RequirementNode,
};

interface RequirementsGraphProps {
  requirements: Requirement[];
  className?: string;
}

const RequirementsGraph: React.FC<RequirementsGraphProps> = ({ 
  requirements, 
  className = '' 
}) => {
  // Convert requirements to nodes and edges using Dagre layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (requirements.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Set graph direction and spacing
    dagreGraph.setGraph({ 
      rankdir: 'LR', // Left to Right
      nodesep: 30,   // Space between nodes in same rank
      ranksep: 300,  // Space between ranks (levels)
      marginx: 20,
      marginy: 20
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeWidth = 280;
    const nodeHeight = 120;

    // Create a mapping for level to rank to ensure proper column ordering
    const levelToRank = new Map();
    const levels = [...new Set(requirements.map(req => req.level))].sort();
    levels.forEach((level, index) => {
      levelToRank.set(level, index);
    });

    // Add nodes to dagre graph and force them into level-based positions
    requirements.forEach((req) => {
      dagreGraph.setNode(req.id.toString(), { 
        width: nodeWidth, 
        height: nodeHeight
      });
    });

    // Create edges based on parent_req_id relationships
    const requirementMap = new Map(requirements.map(req => [req.id, req]));
    
    requirements.forEach((req) => {
      if (req.parent_req_id && requirementMap.has(req.parent_req_id)) {
        dagreGraph.setEdge(req.parent_req_id.toString(), req.id.toString());
        
        edges.push({
          id: `e${req.parent_req_id}-${req.id}`,
          source: req.parent_req_id.toString(),
          target: req.id.toString(),
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#6366f1',
            strokeWidth: 2,
          },
          markerEnd: {
            type: 'arrowclosed',
            width: 20,
            height: 20,
            color: '#6366f1',
          },
        });
      }
    });

    // If no parent relationships exist, create connections between consecutive levels for demonstration
    if (edges.length === 0 && levels.length > 1) {
      for (let i = 0; i < levels.length - 1; i++) {
        const currentLevelReqs = requirements.filter(req => req.level === levels[i]);
        const nextLevelReqs = requirements.filter(req => req.level === levels[i + 1]);
        
        if (currentLevelReqs.length > 0 && nextLevelReqs.length > 0) {
          // Connect first node of current level to first node of next level
          const sourceReq = currentLevelReqs[0];
          const targetReq = nextLevelReqs[0];
          
          dagreGraph.setEdge(sourceReq.id.toString(), targetReq.id.toString());
          
          edges.push({
            id: `demo-${sourceReq.id}-${targetReq.id}`,
            source: sourceReq.id.toString(),
            target: targetReq.id.toString(),
            type: 'smoothstep',
            style: {
              stroke: '#94a3b8',
              strokeWidth: 1,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: 'arrowclosed',
              width: 15,
              height: 15,
              color: '#94a3b8',
            },
          });
        }
      }
    }

    // Apply dagre layout
    dagre.layout(dagreGraph);

    // Group requirements by level and position them in columns
    const levelGroups = new Map<string, any[]>();
    requirements.forEach((req) => {
      const level = req.level || 'L0';
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(req);
    });

    // Create React Flow nodes with level-based column positioning
    requirements.forEach((req) => {
      const dagreNode = dagreGraph.node(req.id.toString());
      const level = req.level || 'L0';
      const levelRank = levelToRank.get(level) || 0;
      const levelRequirements = levelGroups.get(level)!;
      const indexInLevel = levelRequirements.findIndex(r => r.id === req.id);
      
      // Position nodes in columns by level, with vertical spacing within each level
      const columnX = levelRank * 400; // Fixed column spacing
      const verticalSpacing = 150;
      const startY = -(levelRequirements.length - 1) * verticalSpacing / 2;
      const nodeY = startY + indexInLevel * verticalSpacing;
      
      nodes.push({
        id: req.id.toString(),
        type: 'requirement',
        position: {
          x: columnX,
          y: nodeY,
        },
        data: {
          ...req,
          label: req.name,
        },
      });
    });

    return { nodes, edges };
  }, [requirements]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (requirements.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No requirements to visualize
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Add some requirements to see the graph visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Controls 
          className="!bg-white !dark:bg-gray-800 !border-gray-200 !dark:border-gray-700"
          showInteractive={false}
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          className="!fill-gray-300 !dark:fill-gray-600"
        />
      </ReactFlow>
    </div>
  );
};

export default RequirementsGraph;