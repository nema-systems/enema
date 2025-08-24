import React, { Fragment, useState, useEffect, ReactNode } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  RectangleGroupIcon,
  DocumentTextIcon,
  DocumentIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  CogIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { OrganizationSwitcher, UserButton, useAuth, useUser, useOrganization } from "@clerk/clerk-react";
import axios from "axios";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectWorkspaces } from "../store/workspaces/workspaces.selectors";
import { selectSelectedWorkspace } from "../store/workspaces/workspaces.selectors";
import { setWorkspaces, setSelectedWorkspaceId } from "../store/workspaces/workspaces.slice";
import NemaLogo from "../icons/nema-logo";

interface NavigationItemProps {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  current?: boolean;
  count?: number;
  collapsed?: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ name, href, icon: Icon, current, count, collapsed }) => {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive || current
            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
        }`
      }
      title={collapsed ? name : undefined}
    >
      <Icon
        className={`flex-shrink-0 h-5 w-5 transition-colors ${
          collapsed ? '' : 'mr-3'
        } ${
          current ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
        }`}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{name}</span>
          {count !== undefined && (
            <span
              className={`ml-3 inline-block py-0.5 px-2 text-xs rounded-full ${
                current
                  ? 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:group-hover:bg-gray-600'
              }`}
            >
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

interface ApplicationShellProps {
  children: ReactNode;
}

const ApplicationShell: React.FC<ApplicationShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { workspaceId } = useParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  
  const workspaces = useAppSelector(selectWorkspaces);
  const selectedWorkspace = useAppSelector(selectSelectedWorkspace);

  const currentWorkspace = workspaces.find(w => w.id === workspaceId) || selectedWorkspace;

  // Theme handling
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (savedTheme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const applyTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    
    if (selectedTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (selectedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (settingsOpen && !target.closest('[data-settings-dropdown]')) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  // Fetch workspaces when user or organization changes
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user) return;
      
      try {
        setWorkspacesLoaded(false); // Reset loading state
        const token = await getToken({ template: "default" });
        const response = await axios.get("http://localhost:8000/api/v1/workspaces/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const workspaceList = response.data.data || [];
        dispatch(setWorkspaces(workspaceList));
        
        // Clear selected workspace if it's not in the new list (org changed)
        if (selectedWorkspace && !workspaceList.find(w => w.id === selectedWorkspace.id)) {
          dispatch(setSelectedWorkspaceId(''));
        }
        
        // Auto-select first workspace if none selected and we have workspaces
        if ((!selectedWorkspace || !workspaceList.find(w => w.id === selectedWorkspace.id)) && workspaceList.length > 0) {
          dispatch(setSelectedWorkspaceId(workspaceList[0].id));
          // Auto-redirect to first workspace if on home page or if current workspace is invalid
          if (window.location.pathname === '/' || (selectedWorkspace && !workspaceList.find(w => w.id === selectedWorkspace.id))) {
            navigate(`/workspace/${workspaceList[0].id}/products`);
          }
        }
        
        setWorkspacesLoaded(true);
      } catch (err: any) {
        console.error("Error fetching workspaces:", err);
        setWorkspacesLoaded(true);
      }
    };

    fetchWorkspaces();
  }, [user, organization, dispatch]);

  // Update selected workspace when URL changes
  useEffect(() => {
    if (workspaceId && workspaceId !== selectedWorkspace?.id) {
      dispatch(setSelectedWorkspaceId(workspaceId));
    }
  }, [workspaceId, selectedWorkspace?.id, dispatch]);

  // Ensure navigation is always available when we have workspace context
  const navigationWorkspace = currentWorkspace || selectedWorkspace || (workspaces.length > 0 ? workspaces[0] : null);
  
  const navigation = navigationWorkspace ? [
    {
      name: 'Products',
      href: `/workspace/${navigationWorkspace.id}/products`,
      icon: RectangleGroupIcon,
    },
    {
      name: 'Modules',
      href: `/workspace/${navigationWorkspace.id}/modules`,
      icon: CubeIcon,
    },
    {
      name: 'Req Collections',
      href: `/workspace/${navigationWorkspace.id}/req_collections`,
      icon: FolderIcon,
    },
    {
      name: 'Requirements',
      href: `/workspace/${navigationWorkspace.id}/requirements`,
      icon: DocumentTextIcon,
    },
    {
      name: 'Parameters',
      href: `/workspace/${navigationWorkspace.id}/parameters`,
      icon: AdjustmentsHorizontalIcon,
    },
    {
      name: 'Test Cases',
      href: `/workspace/${navigationWorkspace.id}/testcases`,
      icon: ClipboardDocumentListIcon,
    },
    {
      name: 'Files',
      href: `/workspace/${navigationWorkspace.id}/assets`,
      icon: DocumentIcon,
    },
  ] : [];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 pb-4 transition-all duration-300 ${
      !mobile && sidebarCollapsed ? 'w-16 px-2' : 'px-6'
    }`}>
      <div className={`flex h-16 shrink-0 items-center ${
        !mobile && sidebarCollapsed ? 'justify-center' : ''
      }`}>
        <button onClick={() => navigate('/')} className="flex items-center min-w-0">
          <div className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0">
            <NemaLogo />
          </div>
          {(!sidebarCollapsed || mobile) && (
            <span className="ml-2 text-4xl font-serif font-medium text-gray-900 dark:text-gray-100 tracking-normal truncate">nema</span>
          )}
        </button>
      </div>
      
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavigationItem {...item} collapsed={!mobile && sidebarCollapsed} />
                </li>
              ))}
            </ul>
          </li>
        </ul>
        
        
        {/* Collapse toggle button */}
        {!mobile && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronDoubleRightIcon className="h-5 w-5" />
              ) : (
                <ChevronDoubleLeftIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-4">
        {(!sidebarCollapsed || mobile) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <OrganizationSwitcher 
              hidePersonal={false}
              appearance={{
                baseTheme: theme === 'dark' ? 'dark' : 'light',
                elements: {
                  organizationSwitcherTrigger: {
                    width: '100%',
                    padding: '8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'transparent',
                    color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                    '&:hover': {
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                      color: theme === 'dark' ? '#ffffff' : '#111827'
                    }
                  }
                }
              }}
            />
          </div>
        )}
        
        <div className={`flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'justify-between'}`}>
          {(!sidebarCollapsed || mobile) && (
            <div className="flex items-center">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                    userButtonPopoverCard: "w-64"
                  }
                }}
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Account</span>
            </div>
          )}
          
          {/* Settings dropdown */}
          <div className="relative" data-settings-dropdown>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (settingsOpen && !target.closest('[data-settings-dropdown]')) {
        setSettingsOpen(false);
      }
    };

    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  // Render settings dropdown as a portal-like element outside the sidebar
  const SettingsDropdown = () => {
    if (!settingsOpen) return null;

    return (
      <div 
        className={`fixed w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[9999] ${
          sidebarCollapsed
            ? 'bottom-20 left-20'  // When collapsed, position from viewport
            : 'bottom-20 left-60'  // When expanded, position from viewport
        }`}
        data-settings-dropdown
      >
                {/* Workspace Selection */}
                {workspacesLoaded ? (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      Workspace
                    </div>
                    <div className="px-3 py-2">
                      {workspaces.length > 0 ? (
                        <select
                          value={selectedWorkspace?.id || ''}
                          onChange={(e) => {
                            const workspace = workspaces.find(w => String(w.id) === String(e.target.value));
                            if (workspace) {
                              dispatch(setSelectedWorkspaceId(workspace.id));
                              navigate(`/workspace/${workspace.id}/products`);
                              setSettingsOpen(false);
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="" disabled>Select workspace...</option>
                          {workspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          No workspaces available
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      Workspace
                    </div>
                    <div className="px-3 py-2 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading...</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  </>
                )}
                
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Theme
                </div>
                
                <button
                  onClick={() => {
                    handleThemeChange('light');
                    setSettingsOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    theme === 'light' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <SunIcon className="w-4 h-4 mr-3" />
                  Light
                  {theme === 'light' && <div className="ml-auto w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>}
                </button>
                
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    setSettingsOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <MoonIcon className="w-4 h-4 mr-3" />
                  Dark
                  {theme === 'dark' && <div className="ml-auto w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>}
                </button>
                
                <button
                  onClick={() => {
                    handleThemeChange('system');
                    setSettingsOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    theme === 'system' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <ComputerDesktopIcon className="w-4 h-4 mr-3" />
                  System
                  {theme === 'system' && <div className="ml-auto w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>}
                </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-gray-600 transition-opacity ${
              sidebarOpen ? 'opacity-75' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar panel */}
          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full transform transition ease-in-out duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
{sidebarOpen && (
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
            )}
            <Sidebar mobile />
          </div>
          <div className="flex-shrink-0 w-14" />
        </div>

        {/* Desktop sidebar */}
        <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}>
          <Sidebar />
        </div>

        {/* Main content */}
        <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}>
          {/* Mobile header */}
          <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow lg:hidden">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex items-center">
                <h1 className="text-4xl font-serif font-medium text-gray-900 dark:text-gray-100 tracking-normal">
                  {currentWorkspace?.name || 'nema'}
                </h1>
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                <UserButton />
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            {children}
          </main>
        </div>
      </div>
      
      {/* Settings dropdown rendered outside main layout for proper z-index */}
      <SettingsDropdown />
    </>
  );
};

export default ApplicationShell;