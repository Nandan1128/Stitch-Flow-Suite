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
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm bg-primary/10 border-l-4 border-primary rounded-r-lg pl-3 py-1.5 text-primary">
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
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm bg-primary/10 border-l-4 border-primary rounded-r-lg pl-3 py-1.5 text-primary">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm bg-primary/10 border-l-4 border-primary rounded-r-lg pl-3 py-1.5 text-primary">
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
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase font-bold tracking-widest text-sm bg-primary/10 border-l-4 border-primary rounded-r-lg pl-3 py-1.5 text-primary">
              ADMINISTRATION
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="absolute bottom-4 w-full px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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
        </div>
      </SidebarContent>
    </SidebarComponent>
  );
};

export default Sidebar;
