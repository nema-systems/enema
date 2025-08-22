import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import WorkspaceSelector from "./workspace-selector";
import RequirementsView from "./requirements-view";

const LoggedInMainRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<WorkspaceSelector />} />
      <Route path="/workspace/:workspaceId/requirements" element={<RequirementsView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const LoggedOutMainRouter = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in to continue
          </p>
        </div>
      </div>
    </div>
  );
};

const MainRouter = () => {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isSignedIn ? <LoggedInMainRouter /> : <LoggedOutMainRouter />}
    </div>
  );
};

export default MainRouter;