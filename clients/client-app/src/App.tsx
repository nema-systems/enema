import React, { useEffect, useState } from "react";

function App() {
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [mockUsers, setMockUsers] = useState<any>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("f47ac10b-58cc-4372-a567-0e02b2c3d479");
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
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
    // Get auth info
    fetch(
      `${
        import.meta.env.VITE_API_URL || "http://localhost:8000"
      }/api/auth/health`
    )
      .then((res) => res.json())
      .then((data) => setAuthInfo(data))
      .catch(console.error);

    // Get mock users if available
    fetch(
      `${
        import.meta.env.VITE_API_URL || "http://localhost:8000"
      }/api/auth/dev/users`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMockUsers(data))
      .catch(() => {}); // Ignore errors for non-mock mode

    // Get current user if token exists
    if (token) {
      fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setUser(data);
          if (data) {
            // Load projects when user is authenticated
            fetchProjects();
          }
        })
        .catch(() => setToken(null));
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
      } else {
        alert("Login failed");
      }
    } catch (error) {
      alert("Login error");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setShowArtifacts(false);
    setArtifacts([]);
  };

  const fetchArtifacts = async () => {
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
          created_by: user?.username || "unknown",
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

  if (!token) {
    return (
      <div
        style={{
          padding: "20px",
          fontFamily: "Arial, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h1>Nema Sandbox</h1>

        {authInfo && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#f0f8ff",
              borderRadius: "8px",
            }}
          >
            <h3>Authentication Mode</h3>
            <p>
              <strong>Mode:</strong>{" "}
              {authInfo.mock_auth
                ? "Mock Authentication (Development)"
                : "AWS Cognito"}
            </p>
            <p>
              <strong>Environment:</strong> {authInfo.environment}
            </p>
            {authInfo.mock_auth && (
              <p style={{ color: "green" }}>✅ No AWS credentials required!</p>
            )}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <h3>Login</h3>
          <LoginForm onLogin={login} />
        </div>

        {mockUsers && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
            <h3>Available Demo Users</h3>
            <p>Click any user below to auto-fill the login form:</p>
            <div style={{ display: "grid", gap: "10px" }}>
              {mockUsers.users.map((u: any) => (
                <button
                  key={u.username}
                  onClick={() => login(u.username, u.username)}
                  style={{
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong>{u.username}</strong> - {u.given_name} {u.family_name}{" "}
                  ({u.groups.join(", ")})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Nema Dashboard 1</h1>
        <button onClick={logout} style={buttonStyle}>
          Logout
        </button>
      </div>

      {user && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "8px",
          }}
        >
          <h3>Welcome, {user.full_name || user.username}!</h3>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Groups:</strong> {user.groups.join(", ")}
          </p>
          <p>
            <strong>Tenant:</strong> {user.tenant_id}
          </p>
        </div>
      )}

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
        <p>
          Auth Mode:{" "}
          {authInfo?.mock_auth ? "Mock Authentication" : "AWS Cognito"}
        </p>
      </div>
    </div>
  );
}

function LoginForm({
  onLogin,
}: {
  onLogin: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "300px",
      }}
    >
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />
      <button type="submit" style={buttonStyle}>
        Login
      </button>
    </form>
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

const inputStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "4px",
};

const cardStyle = {
  padding: "20px",
  backgroundColor: "white",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

export default App;
