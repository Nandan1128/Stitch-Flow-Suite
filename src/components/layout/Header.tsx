
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Scissors } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 w-full sticky top-0 z-40 backdrop-blur-sm bg-white/80">
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger />
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-1 sm:p-1.5 rounded-lg shadow-md shrink-0">
              <Scissors size={18} className="sm:size-[22px]" />
            </span>
            <h1
              className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent leading-none"
            >
              StitchFlow
            </h1>
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">ERP Management</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 rounded-full sm:rounded-md
                  bg-white border border-gray-100 sm:border-gray-200
                  text-gray-800 font-semibold
                  hover:bg-gray-50
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                  transition-all duration-200
                  shadow-sm
                `}
                style={{
                  minHeight: "32px",
                }}
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0">
                  <User size={15} />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight text-left">
                  <span className="text-sm font-bold truncate max-w-[80px] lg:max-w-[120px]">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize font-medium">{user.role}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56 mt-1 shadow-xl">
              <div className="px-2 py-1.5 text-xs text-muted-foreground sm:hidden">
                Logged in as <span className="font-bold text-foreground">{user.name}</span>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  to={
                    user.role === "admin"
                      ? "/dashboard/admin-profile"
                      : "/dashboard/supervisor-profile"
                  }
                  className="flex items-center gap-2 w-full py-2.5 sm:py-2"
                >
                  <User size={16} className="text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="flex items-center gap-2 w-full py-2.5 sm:py-2">
                    <Settings size={16} className="text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-destructive focus:text-destructive py-2.5 sm:py-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;

