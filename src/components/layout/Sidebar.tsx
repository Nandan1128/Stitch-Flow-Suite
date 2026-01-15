import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Scissors,
  BarChart2,
  Calendar,
  Settings,
  LogOut,
  DollarSign,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { setOpen, setOpenMobile, isMobile, open, openMobile } = useSidebar();

  // Helper to close sidebar on menu item click
  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <SidebarComponent>
      <SidebarContent>
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-lg shadow-lg animate-move-horizontal">
              <Scissors size={22} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#065f46] via-[#1e3a8a] to-[#ea580c] bg-clip-text text-transparent">
                StitchFlow Suite
              </h1>
              <p className="text-xs text-muted-foreground">Seamless ERP Management</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm text-black pl-3 py-1.5">
            OVERVIEW
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <LayoutDashboard size={18} />
                    <span className="text-primary">Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm text-black pl-3 py-1.5">
            MANAGEMENT
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/employees"
                      onClick={handleMenuClick}
                      className={({ isActive }) =>
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Users size={18} />
                      <span className="text-primary">Employees</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/workers"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <Users size={18} />
                    <span className="text-primary">Workers</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/products"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <Scissors size={18} />
                    <span className="text-primary">Products</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/production"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <Calendar size={18} />
                    <span className="text-primary">Production</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/salary"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <DollarSign size={18} />
                    <span className="text-primary">Salary</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/attendance"
                      onClick={handleMenuClick}
                      className={({ isActive }) =>
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Calendar size={18} />
                      <span className="text-primary">Attendance</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm text-black pl-3 py-1.5">
            REPORTS & FINANCE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reports"
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <BarChart2 size={18} />
                    <span className="text-primary">Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm text-black pl-3 py-1.5">
            {isAdmin ? "ADMINISTRATION" : "ACCOUNT"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/settings"
                      onClick={handleMenuClick}
                      className={({ isActive }) =>
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Settings size={18} />
                      <span className="text-primary">Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    className="w-full flex items-center gap-2 text-destructive hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut size={18} />
                    <span className="text-primary">Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarComponent>
  );
};

export default Sidebar;
