import { useNavigate, useParams, useLocation } from "react-router-dom";

interface WorkspaceNavProps {
  workspaceName?: string;
}

const WorkspaceNav = ({ workspaceName }: WorkspaceNavProps) => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();

  const navItems = [
    {
      name: "Projects",
      path: `/workspace/${workspaceId}/projects`,
      current: location.pathname.includes("/projects")
    },
    {
      name: "Requirements", 
      path: `/workspace/${workspaceId}/requirements`,
      current: location.pathname.includes("/requirements")
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Workspaces
            </button>
            {workspaceName && (
              <span className="text-sm font-medium text-gray-900">
                {workspaceName}
              </span>
            )}
          </div>
          
          <nav className="flex space-x-8">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceNav;