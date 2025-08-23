import { Routes, Route, Navigate } from "react-router-dom";
import { useUser, SignIn } from "@clerk/clerk-react";
import RequirementsView from "./requirements-view";
import ProductsView from "./products-view";
import ModulesView from "./modules-view";
import ParametersView from "./parameters-view";
import TestCasesView from "./testcases-view";
import AssetsView from "./assets-view";
import RequirementDetail from "./requirement-detail";
import ApplicationShell from "../components/application-shell";
import NemaLogo from "../icons/nema-logo";

const LoggedInMainRouter = () => {
  return (
    <ApplicationShell>
      <Routes>
        <Route path="/" element={<div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading workspaces...</div>} />
        <Route path="/workspace/:workspaceId/products" element={<ProductsView />} />
        <Route path="/workspace/:workspaceId/requirements" element={<RequirementsView />} />
        <Route path="/workspace/:workspaceId/modules" element={<ModulesView />} />
        <Route path="/workspace/:workspaceId/parameters" element={<ParametersView />} />
        <Route path="/workspace/:workspaceId/testcases" element={<TestCasesView />} />
        <Route path="/workspace/:workspaceId/assets" element={<AssetsView />} />
        <Route path="/workspace/:workspaceId/requirements/:requirementId" element={<RequirementDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ApplicationShell>
  );
};

const LoggedOutMainRouter = () => {
  return (
    <main className="relative isolate h-full min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 overflow-hidden">
      {/* Background decorative gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-3/4 h-3/4 bg-gradient-to-br from-purple-100/20 via-indigo-200/20 to-blue-100/20 dark:from-purple-900/20 dark:via-indigo-800/20 dark:to-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl backdrop-blur-sm">
            {/* Logo and heading */}
            <div className="text-center mb-8">
              <div className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-6">
                <NemaLogo />
              </div>
              <span className="inline-block text-4xl font-serif font-medium text-gray-900 dark:text-gray-100 tracking-normal mb-4">
                nema
              </span>
              <p className="text-gray-700 dark:text-gray-300 font-sans">
                Sign in to access your workspaces
              </p>
            </div>
            
            {/* Clerk SignIn component */}
            <div className="flex justify-center">
              <SignIn 
                routing="hash"
                appearance={{
                  elements: {
                    formButtonPrimary: "bg-gradient-to-r from-[#001447] via-[#0a2060] to-[#182a7e] hover:from-[#0a225f] hover:via-[#162f7e] hover:to-[#243391] text-white font-medium rounded-lg border border-white/20 transition-all duration-300",
                    card: "bg-transparent shadow-none border-0 p-0",
                    headerTitle: "text-xl font-serif text-gray-900 dark:text-gray-100 mb-4",
                    headerSubtitle: "text-gray-600 dark:text-gray-400 font-sans text-sm mb-6",
                    socialButtonsBlockButton: "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg",
                    formFieldInput: "border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 dark:bg-gray-800 dark:text-gray-300 px-4 py-3",
                    formFieldLabel: "text-gray-700 dark:text-gray-300 font-medium text-sm",
                    dividerLine: "bg-gray-300 dark:bg-gray-600",
                    dividerText: "text-gray-500 dark:text-gray-400 font-sans text-sm",
                    footerActionLink: "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium",
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
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