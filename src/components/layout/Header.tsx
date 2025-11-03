
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
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Scissors } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-2 sm:px-4 md:px-6 w-full">
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger />
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-1.5 rounded-lg shadow-lg animate-move-horizontal">
              <Scissors size={22} />
            </span>
            <h1
              className="text-[1.2rem] sm:text-xl font-bold bg-gradient-to-r from-[#065f46] via-[#1e3a8a] to-[#ea580c] bg-clip-text text-transparent font-sans leading-tight"
              style={{
                margin: 0,
              }}
            >
              StitchFlow Suite
            </h1>
          </div>
          <span className="text-[0.62rem] sm:text-xs text-muted-foreground">ERP Management</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md
                  bg-white border border-gray-200
                  text-gray-800 font-semibold
                  hover:bg-gray-50
                  focus:outline-none focus:ring-2 focus:ring-[#0fb981]/20
                  transition-all duration-200
                  group
                  shadow-sm
                  text-xs
                `}
                style={{
                  minHeight: "32px",
                  fontSize: "0.875rem",
                }}
              >
                <span className="flex items-center justify-center rounded-full p-1 bg-transparent">
                  <User size={17} className="text-green-600 drop-shadow" />
                </span>
                <span className="font-bold drop-shadow">{user.name}</span>
                <span className="ml-2 text-xs bg-gray-100 text-green-700 rounded px-2 py-0.5 capitalize font-semibold">
                  {user.role}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 sm:w-56 z-50">
              <ScrollArea className="max-h-64">
                <DropdownMenuItem asChild>
                  <Link
                    to={
                      user.role === "admin"
                        ? "/dashboard/admin-profile"
                        : "/dashboard/supervisor-profile"
                    }
                    className="flex items-center gap-2 w-full"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="flex items-center gap-2 w-full">
                      <Settings size={16} />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={logout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </DropdownMenuItem>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;

