
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
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Scissors,
  BarChart2,
  Calendar,
  Settings,
  LogOut,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <SidebarComponent>
      <SidebarContent>
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-lg shadow-lg">
              <Scissors size={22} className="animate-[spin_3s_ease-in-out_1]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Mohil ERP
              </h1>
              <p className="text-xs text-muted-foreground">Enterprise Management</p>
            </div>
          </div>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs tracking-wider font-semibold">
            OVERVIEW
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => 
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs tracking-wider font-semibold">
            MANAGEMENT
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/employees" 
                      className={({ isActive }) => 
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Users size={18} />
                      <span>Employees</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/workers" 
                      className={({ isActive }) => 
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Users size={18} />
                      <span>Workers</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/products" 
                    className={({ isActive }) => 
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <Scissors size={18} />
                    <span>Products</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/production" 
                    className={({ isActive }) => 
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <Calendar size={18} />
                    <span>Production</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs tracking-wider font-semibold">
            REPORTS & FINANCE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/reports" 
                    className={({ isActive }) => 
                      `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                    }
                  >
                    <BarChart2 size={18} />
                    <span>Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs tracking-wider font-semibold">
              ADMINISTRATION
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/settings" 
                      className={({ isActive }) => 
                        `transition-all duration-200 hover:translate-x-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`
                      }
                    >
                      <Settings size={18} />
                      <span>Settings</span>
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
                    <button className="w-full flex items-center gap-2 text-destructive hover:text-destructive">
                      <LogOut size={18} />
                      <span>Logout</span>
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
