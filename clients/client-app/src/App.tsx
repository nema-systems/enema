import { useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
  useAuth,
  useOrganization,
  useOrganizationList,
  OrganizationSwitcher,
  CreateOrganization,
} from "@clerk/clerk-react";

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}>
        <h1>Nema Sandbox</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <OrganizationSwitcher 
              hidePersonal={false}
              createOrganizationMode="modal"
              afterSelectOrganizationUrl={window.location.href}
            />
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <SignedOut>
        <div style={{
          textAlign: "center",
          padding: "40px",
          backgroundColor: "#f0f8ff",
          borderRadius: "8px",
        }}>
          <h2>Welcome to Nema Sandbox</h2>
          <p>Please sign in to access the dashboard</p>
        </div>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  );
}

function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { organizationList, setActive } = useOrganizationList();
  
  
  // State for the new requirement management system
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Debug state for local organizations and token
  const [localOrganizations, setLocalOrganizations] = useState<any[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<any>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'dashboard' | 'requirements' | 'parameters' | 'testcases' | 'projects'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to decode JWT token (without verification)
  const decodeJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  // Debug: Fetch local organizations and update current token
  const fetchLocalOrganizations = async () => {
    const token = await getToken({ template: "default" });
    if (!token) return;

    // Store the current token for display
    setCurrentToken(token);
    
    // Decode and store JWT payload for debugging
    const decoded = decodeJWT(token);
    setDecodedToken(decoded);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/organizations/debug`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocalOrganizations(data.data || []);
        console.log('Local organizations:', data.data);
      } else {
        console.error('Failed to fetch local organizations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching local organizations:', error);
    }
  };

  // Fetch workspaces for the current organization
  const fetchWorkspaces = async () => {
    const token = await getToken({ template: "default" });
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.data || []);
        // Auto-select first workspace if available
        if (data.data?.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(data.data[0].id);
        }
      } else {
        setError('Failed to fetch workspaces');
      }
    } catch (error) {
      setError('Error fetching workspaces');
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load workspaces when user is authenticated and organization is available
    if (user && organization) {
      fetchWorkspaces();
    }
    // Always fetch local organizations for debug when user is authenticated
    if (user) {
      fetchLocalOrganizations();
    }
  }, [user, organization]);


  // Fetch requirements for selected workspace
  const fetchRequirements = async () => {
    if (!selectedWorkspaceId) return;
    const token = await getToken({ template: "default" });
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces//${selectedWorkspaceId}/requirements`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequirements(data.data?.items || []);
      } else {
        setError('Failed to fetch requirements');
      }
    } catch (error) {
      setError('Error fetching requirements');
      console.error('Error fetching requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new requirement
  const createRequirement = async () => {
    if (!selectedWorkspaceId) {
      alert('Please select a workspace first');
      return;
    }
    
    const token = await getToken({ template: "default" });
    if (!token) return;

    const name = prompt('Enter requirement name:');
    if (!name) return;

    const description = prompt('Enter requirement description (optional):') || '';
    const priority = prompt('Enter priority (LOW, MEDIUM, HIGH, CRITICAL):') || 'MEDIUM';

    setLoading(true);
    setError(null);
    try {
      const newRequirement = {
        name,
        description,
        priority: priority.toUpperCase(),
        status: 'DRAFT',
        req_type: 'FUNCTIONAL'
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces//${selectedWorkspaceId}/requirements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newRequirement),
        }
      );

      if (response.ok) {
        const createdReq = await response.json();
        setRequirements((prev) => [createdReq.data, ...prev]);
        alert(`Requirement "${name}" created successfully!`);
      } else {
        const errorData = await response.json();
        setError(`Failed to create requirement: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Error creating requirement');
      console.error('Error creating requirement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects for selected workspace
  const fetchProjects = async () => {
    if (!selectedWorkspaceId) return;
    const token = await getToken({ template: "default" });
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces//${selectedWorkspaceId}/projects`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data?.items || []);
      } else {
        setError('Failed to fetch projects');
      }
    } catch (error) {
      setError('Error fetching projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new project
  const createProject = async () => {
    if (!selectedWorkspaceId) {
      alert('Please select a workspace first');
      return;
    }
    
    const token = await getToken({ template: "default" });
    if (!token) return;

    const name = prompt('Enter project name:');
    if (!name) return;

    const description = prompt('Enter project description (optional):') || '';

    setLoading(true);
    setError(null);
    try {
      const newProject = {
        name,
        description
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces//${selectedWorkspaceId}/projects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newProject),
        }
      );

      if (response.ok) {
        const createdProject = await response.json();
        setProjects((prev) => [createdProject.data, ...prev]);
        alert(`Project "${name}" created successfully!`);
      } else {
        const errorData = await response.json();
        setError(`Failed to create project: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Error creating project');
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async () => {
    const token = await getToken({ template: "default" });
    if (!token) return;

    // Debug: Log the token being used for workspace creation
    const decoded = decodeJWT(token);
    console.log('Workspace creation token:', decoded);

    const name = prompt('Enter workspace name:');
    if (!name) return;

    setLoading(true);
    setError(null);
    try {
      const newWorkspace = {
        name,
        metadata: {
          created_by: user?.fullName || user?.firstName || 'Unknown',
          organization: organization?.name || 'Unknown'
        }
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/workspaces/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newWorkspace),
        }
      );

      if (response.ok) {
        const createdWorkspace = await response.json();
        setWorkspaces((prev) => [createdWorkspace.data, ...prev]);
        alert(`Workspace "${name}" created successfully!`);
      } else {
        const errorData = await response.json();
        setError(`Failed to create workspace: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Error creating workspace');
      console.error('Error creating workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!organization) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
        <div style={{ ...cardStyle, backgroundColor: "#fff3cd", border: "1px solid #ffeaa7", marginBottom: "20px" }}>
          <h3>Organization Required</h3>
          <p>Please select or create an organization to access the requirement management system.</p>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={cardStyle}>
            <h4>Select Organization</h4>
            <p style={{ fontSize: "14px", marginBottom: "15px" }}>Choose an existing organization:</p>
            <OrganizationSwitcher 
              hidePersonal={true}
              createOrganizationMode="navigation"
              afterSelectOrganizationUrl={window.location.href}
            />
          </div>
          
          <div style={cardStyle}>
            <h4>Create New Organization</h4>
            <p style={{ fontSize: "14px", marginBottom: "15px" }}>Create a new organization for your team:</p>
            <CreateOrganization 
              afterCreateOrganizationUrl={window.location.href}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {/* Header with user and organization info */}
      <div style={{ ...cardStyle, marginBottom: "20px", backgroundColor: "#e8f5e8" }}>
        <h3>Welcome, {user?.fullName || user?.firstName || "User"}!</h3>
        <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress}</p>
        <p><strong>Organization:</strong> {organization?.name || "None selected"}</p>
        <p><strong>User ID:</strong> {user?.id}</p>
        
        {/* Organization Selection */}
        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Organization Selection</h4>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>
              Available Organizations ({organizationList?.length || 0}):
            </span>
            <OrganizationSwitcher 
              hidePersonal={false}
              createOrganizationMode="modal"
              afterSelectOrganizationUrl={window.location.href}
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "border: 1px solid #007bff; padding: 8px 12px; border-radius: 4px; background: white;"
                }
              }}
            />
            {organizationList && organizationList.length > 0 && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                {organizationList.map((org: any) => (
                  <span key={org.organization.id} style={{ marginRight: "10px" }}>
                    {org.organization.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local Organizations Status */}
      {/* Auth Token Display */}
      <div style={{ ...cardStyle, marginBottom: "20px", backgroundColor: "#fff3cd", border: "1px solid #ffeaa7" }}>
        <h3>Authentication Token</h3>
        {currentToken ? (
          <div>
            <div style={{ 
              backgroundColor: "#f8f9fa", 
              padding: "10px", 
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "12px",
              wordBreak: "break-all",
              maxHeight: "100px",
              overflowY: "auto"
            }}>
              {currentToken}
            </div>
            <button 
              style={{ ...buttonStyle, marginTop: "10px", fontSize: "12px" }}
              onClick={() => navigator.clipboard.writeText(currentToken)}
            >
              Copy Token
            </button>
            
            {decodedToken && (
              <div style={{ marginTop: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Decoded JWT Payload:</h4>
                <div style={{ 
                  backgroundColor: "#e9ecef", 
                  padding: "10px", 
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  maxHeight: "150px",
                  overflowY: "auto"
                }}>
                  {JSON.stringify(decodedToken, null, 2)}
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px" }}>
                  <strong>Organization ID:</strong> {decodedToken.org_id || decodedToken.organization_id || 'Not found'}
                  <br />
                  <strong>Organization Slug:</strong> {decodedToken.org_slug || decodedToken.organization_slug || 'Not found'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>No token available</p>
        )}
      </div>

      <div style={{ ...cardStyle, marginBottom: "20px", backgroundColor: "#f0f8ff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3>Local Organizations</h3>
          <button style={buttonStyle} onClick={fetchLocalOrganizations}>
            Refresh
          </button>
        </div>
        
        {localOrganizations.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No organizations found in local database</p>
        ) : (
          <div>
            <p><strong>Found {localOrganizations.length} organization(s) in local database:</strong></p>
            <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
              {localOrganizations.map((org: any) => (
                <div key={org.id} style={{ 
                  padding: "10px", 
                  backgroundColor: "#ffffff", 
                  border: "1px solid #ddd", 
                  borderRadius: "4px",
                  fontSize: "14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <strong>{org.name || org.slug}</strong>
                      {org.name && org.slug !== org.name && <span> ({org.slug})</span>}
                      <br />
                      <span style={{ color: "#666" }}>
                        DB ID: {org.id} | Clerk ID: {org.clerk_org_id || 'N/A'}
                      </span>
                      {org.image_url && (
                        <div style={{ marginTop: "5px" }}>
                          <img src={org.image_url} alt="Org" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: "12px", 
                      color: "#888", 
                      backgroundColor: org.id === (organization as any)?.id ? "#d4edda" : "#f8f9fa",
                      padding: "2px 6px",
                      borderRadius: "3px"
                    }}>
                      {org.id === (organization as any)?.id ? "CURRENT" : "STORED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div style={{ ...cardStyle, marginBottom: "20px", backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" }}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "10px", padding: "2px 8px", fontSize: "12px" }}>×</button>
        </div>
      )}

      {/* Workspace Selection */}
      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3>Workspace Selection</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select 
            value={selectedWorkspaceId || ''} 
            onChange={(e) => setSelectedWorkspaceId(Number(e.target.value) || null)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="">Select a workspace...</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} (ID: {workspace.id})
              </option>
            ))}
          </select>
          <button style={{ ...buttonStyle, backgroundColor: "#28a745" }} onClick={createWorkspace} disabled={loading}>
            Create Workspace
          </button>
          <button style={buttonStyle} onClick={fetchWorkspaces} disabled={loading}>
            Refresh
          </button>
        </div>
        {selectedWorkspaceId && (
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
            Selected: {workspaces.find(w => w.id === selectedWorkspaceId)?.name || `Workspace ${selectedWorkspaceId}`}
          </p>
        )}
      </div>

      {!selectedWorkspaceId ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <h3>Please Select a Workspace</h3>
          <p>Select a workspace above to start managing requirements, parameters, and test cases.</p>
        </div>
      ) : (
        <>
          {/* Navigation */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button 
                style={{ ...buttonStyle, backgroundColor: activeView === 'dashboard' ? '#0056b3' : '#007bff' }} 
                onClick={() => setActiveView('dashboard')}
              >
                Dashboard
              </button>
              <button 
                style={{ ...buttonStyle, backgroundColor: activeView === 'requirements' ? '#0056b3' : '#007bff' }} 
                onClick={() => { setActiveView('requirements'); fetchRequirements(); }}
              >
                Requirements
              </button>
              <button 
                style={{ ...buttonStyle, backgroundColor: activeView === 'projects' ? '#0056b3' : '#007bff' }} 
                onClick={() => { setActiveView('projects'); fetchProjects(); }}
              >
                Projects
              </button>
              <button 
                style={{ ...buttonStyle, backgroundColor: activeView === 'parameters' ? '#0056b3' : '#007bff' }} 
                onClick={() => setActiveView('parameters')}
              >
                Parameters
              </button>
              <button 
                style={{ ...buttonStyle, backgroundColor: activeView === 'testcases' ? '#0056b3' : '#007bff' }} 
                onClick={() => setActiveView('testcases')}
              >
                Test Cases
              </button>
            </div>
          </div>

          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              <div style={cardStyle}>
                <h3>Requirements Management</h3>
                <p>Create and manage functional and non-functional requirements with version control.</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button style={{ ...buttonStyle, backgroundColor: "#28a745" }} onClick={createRequirement} disabled={loading}>
                    Create Requirement
                  </button>
                  <button style={buttonStyle} onClick={() => { setActiveView('requirements'); fetchRequirements(); }} disabled={loading}>
                    View All Requirements
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <h3>Project Management</h3>
                <p>Organize requirements into projects and components.</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button style={{ ...buttonStyle, backgroundColor: "#17a2b8" }} onClick={createProject} disabled={loading}>
                    Create Project
                  </button>
                  <button style={buttonStyle} onClick={() => { setActiveView('projects'); fetchProjects(); }} disabled={loading}>
                    View All Projects
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <h3>Parameters</h3>
                <p>Define and manage system parameters with validation rules.</p>
                <button style={buttonStyle} onClick={() => setActiveView('parameters')}>Manage Parameters</button>
              </div>

              <div style={cardStyle}>
                <h3>Test Cases</h3>
                <p>Create test cases linked to requirements for verification.</p>
                <button style={buttonStyle} onClick={() => setActiveView('testcases')}>Manage Test Cases</button>
              </div>

              <div style={cardStyle}>
                <h3>Releases & Tags</h3>
                <p>Organize requirements into releases and apply tags for categorization.</p>
                <button style={buttonStyle}>Manage Releases</button>
              </div>

              <div style={cardStyle}>
                <h3>Assets & Documentation</h3>
                <p>Upload and manage files, images, and documentation.</p>
                <button style={buttonStyle}>Manage Assets</button>
              </div>
            </div>
          )}

          {/* Requirements View */}
          {activeView === 'requirements' && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2>Requirements</h2>
                <button style={{ ...buttonStyle, backgroundColor: "#28a745" }} onClick={createRequirement} disabled={loading}>
                  Create New Requirement
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>Loading requirements...</div>
              ) : requirements.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center" }}>
                  <p>No requirements found. Create your first requirement!</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "15px" }}>
                  {requirements.map((req: any, index: number) => (
                    <div key={req.id || index} style={{ ...cardStyle, borderLeft: "4px solid #007bff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                            {req.public_id || req.name || `Requirement ${index + 1}`}
                          </h4>
                          <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>
                            <strong>Status:</strong> {req.status || 'DRAFT'} | 
                            <strong> Priority:</strong> {req.priority || 'MEDIUM'} | 
                            <strong> Type:</strong> {req.req_type || 'FUNCTIONAL'}
                          </p>
                          {req.description && (
                            <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>{req.description}</p>
                          )}
                          {req.created_at && (
                            <p style={{ margin: "0", fontSize: "12px", color: "#888" }}>
                              Created: {new Date(req.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div style={{ backgroundColor: "#e9ecef", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", color: "#495057" }}>
                          ID: {req.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects View */}
          {activeView === 'projects' && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2>Projects</h2>
                <button style={{ ...buttonStyle, backgroundColor: "#17a2b8" }} onClick={createProject} disabled={loading}>
                  Create New Project
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>Loading projects...</div>
              ) : projects.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center" }}>
                  <p>No projects found. Create your first project!</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "15px" }}>
                  {projects.map((project: any, index: number) => (
                    <div key={project.id || index} style={{ ...cardStyle, borderLeft: "4px solid #17a2b8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                            {project.name || `Project ${index + 1}`}
                          </h4>
                          {project.description && (
                            <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>{project.description}</p>
                          )}
                          {project.created_at && (
                            <p style={{ margin: "0", fontSize: "12px", color: "#888" }}>
                              Created: {new Date(project.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div style={{ backgroundColor: "#e9ecef", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", color: "#495057" }}>
                          ID: {project.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other views placeholders */}
          {activeView === 'parameters' && (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <h2>Parameters Management</h2>
              <p>Parameter management functionality coming soon...</p>
            </div>
          )}

          {activeView === 'testcases' && (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <h2>Test Cases Management</h2>
              <p>Test case management functionality coming soon...</p>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
        <p>API: {import.meta.env.VITE_API_URL || "http://localhost:8000"}</p>
        <p>Auth: Clerk with Organization Support</p>
        <p>Workspace: {selectedWorkspaceId ? workspaces.find(w => w.id === selectedWorkspaceId)?.name || selectedWorkspaceId : 'None selected'}</p>
      </div>
    </div>
  );
}


const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};


const cardStyle = {
  padding: "20px",
  backgroundColor: "white",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

export default App;
