import { useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
  useAuth,
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
        <div>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
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
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("f47ac10b-58cc-4372-a567-0e02b2c3d479");
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/projects/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load projects when user is authenticated
    if (user) {
      fetchProjects();
    }
  }, [user]);


  const fetchArtifacts = async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/artifacts/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      } else {
        console.error("Failed to fetch artifacts");
      }
    } catch (error) {
      console.error("Error fetching artifacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const createRandomArtifact = async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const artifactTypes = ["DATA", "WORKFLOW", "FUNCTION", "MODEL"];
      const randomArtifact = {
        name: `Random Artifact ${Date.now()}`,
        artifact_type:
          artifactTypes[Math.floor(Math.random() * artifactTypes.length)],
        description: `A randomly generated artifact created at ${new Date().toLocaleString()}`,
        project_id: selectedProjectId,
        tags: ["random", "demo", "test"],
        metadata: {
          created_by: user?.username || user?.firstName || "unknown",
          random_id: Math.floor(Math.random() * 10000),
          source: "client-app",
        },
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/artifacts/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(randomArtifact),
        }
      );

      if (response.ok) {
        const newArtifact = await response.json();
        setArtifacts((prev) => [newArtifact, ...prev]);
        alert("Random artifact created successfully!");
      } else {
        const error = await response.text();
        alert(`Failed to create artifact: ${error}`);
      }
    } catch (error) {
      alert("Error creating artifact");
      console.error("Error creating artifact:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewArtifacts = () => {
    setShowArtifacts(true);
    fetchArtifacts();
  };

  const createProject = async () => {
    const token = await getToken();
    if (!token) return;

    const projectName = prompt("Enter project name:");
    if (!projectName) return;

    const projectDescription = prompt("Enter project description (optional):") || "";

    setLoading(true);
    try {
      const newProject = {
        name: projectName,
        description: projectDescription,
        tenant_id: "default",
        workspace_id: "default"
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/projects/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newProject),
        }
      );

      if (response.ok) {
        const createdProject = await response.json();
        setProjects((prev) => [createdProject, ...prev]);
        alert(`Project "${projectName}" created successfully!`);
      } else {
        const error = await response.text();
        alert(`Failed to create project: ${error}`);
      }
    } catch (error) {
      alert("Error creating project");
      console.error("Error creating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewProjects = () => {
    setShowProjects(true);
    fetchProjects();
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>

      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
        }}
      >
        <h3>Welcome, {user?.fullName || user?.firstName || "User"}!</h3>
        <p>
          <strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress}
        </p>
        <p>
          <strong>User ID:</strong> {user?.id}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        <div style={cardStyle}>
          <h3>Artifacts</h3>
          <p>
            Manage and track your data artifacts, models, and analysis results.
          </p>
          <div style={{ 
            marginBottom: "15px", 
            padding: "10px", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            <strong>Selected Project:</strong> {
              projects.find(p => p.id === selectedProjectId)?.name || 
              `ID: ${selectedProjectId.substring(0, 8)}...`
            }
            <br />
            <small style={{ color: "#666" }}>
              Artifacts will be created in this project. Click "View Projects" to change.
            </small>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              onClick={viewArtifacts}
              disabled={loading}
            >
              {loading ? "Loading..." : "View Artifacts"}
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: "#28a745" }}
              onClick={createRandomArtifact}
              disabled={loading}
            >
              Add Random Artifact
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h3>Projects</h3>
          <p>Manage and organize your projects and workspaces.</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              onClick={viewProjects}
              disabled={loading}
            >
              {loading ? "Loading..." : "View Projects"}
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: "#17a2b8" }}
              onClick={createProject}
              disabled={loading}
            >
              Create Project
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h3>Workflows</h3>
          <p>Create and monitor data processing workflows with Temporal.</p>
          <button style={buttonStyle}>View Workflows</button>
        </div>

        <div style={cardStyle}>
          <h3>Data Search</h3>
          <p>Search and discover data using semantic vector search.</p>
          <button style={buttonStyle}>Search Data</button>
        </div>

        <div style={cardStyle}>
          <h3>AI Agent</h3>
          <p>Extract insights and generate content using AI capabilities.</p>
          <button style={buttonStyle}>AI Tools</button>
        </div>
      </div>

      {showArtifacts && (
        <div style={{ marginTop: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Artifacts</h2>
            <button
              style={{ ...buttonStyle, backgroundColor: "#6c757d" }}
              onClick={() => setShowArtifacts(false)}
            >
              Hide Artifacts
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Loading artifacts...
            </div>
          ) : artifacts.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <p>
                No artifacts found. Create your first artifact using the "Add
                Random Artifact" button!
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {artifacts.map((artifact: any, index: number) => (
                <div
                  key={artifact.id || index}
                  style={{ ...cardStyle, borderLeft: "4px solid #007bff" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                        {artifact.name || `Artifact ${index + 1}`}
                      </h4>
                      <p
                        style={{
                          margin: "0 0 10px 0",
                          color: "#666",
                          fontSize: "14px",
                        }}
                      >
                        <strong>Type:</strong>{" "}
                        {artifact.artifact_type || "Unknown"}
                      </p>
                      {artifact.description && (
                        <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                          {artifact.description}
                        </p>
                      )}
                      {artifact.created_at && (
                        <p
                          style={{
                            margin: "0",
                            fontSize: "12px",
                            color: "#888",
                          }}
                        >
                          Created:{" "}
                          {new Date(artifact.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        backgroundColor: "#e9ecef",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#495057",
                      }}
                    >
                      ID: {artifact.id || "N/A"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showProjects && (
        <div style={{ marginTop: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Projects</h2>
            <button
              style={{ ...buttonStyle, backgroundColor: "#6c757d" }}
              onClick={() => setShowProjects(false)}
            >
              Hide Projects
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <p>
                No projects found. Create your first project using the "Create
                Project" button!
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {projects.map((project: any, index: number) => (
                <div
                  key={project.id || index}
                  style={{ 
                    ...cardStyle, 
                    borderLeft: selectedProjectId === project.id ? "4px solid #28a745" : "4px solid #17a2b8",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                        {project.name || `Project ${index + 1}`}
                        {selectedProjectId === project.id && (
                          <span style={{ 
                            marginLeft: "10px", 
                            fontSize: "12px", 
                            color: "#28a745",
                            fontWeight: "normal"
                          }}>
                            (Selected for artifacts)
                          </span>
                        )}
                      </h4>
                      {project.description && (
                        <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                          {project.description}
                        </p>
                      )}
                      <p
                        style={{
                          margin: "0 0 10px 0",
                          color: "#666",
                          fontSize: "14px",
                        }}
                      >
                        <strong>Workspace:</strong> {project.workspace_id || "default"} | 
                        <strong> Tenant:</strong> {project.tenant_id || "default"}
                      </p>
                      {project.created_at && (
                        <p
                          style={{
                            margin: "0",
                            fontSize: "12px",
                            color: "#888",
                          }}
                        >
                          Created: {new Date(project.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        backgroundColor: "#e9ecef",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#495057",
                      }}
                    >
                      ID: {project.id || "N/A"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
        <p>API: {import.meta.env.VITE_API_URL || "http://localhost:8000"}</p>
        <p>Auth Mode: Clerk Authentication</p>
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
