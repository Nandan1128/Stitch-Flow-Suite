
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
    <header className="bg-white border-b h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-1.5 rounded-lg shadow-lg animate-move-horizontal">
              <Scissors size={22} />
            </span>
            <h1
              className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-sans leading-tight"
              style={{
                margin: 0,
              }}
            >
              StitchFlow Suite
            </h1>
          </div>
          <span className="text-xs text-muted-foreground">ERP Management</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  bg-gradient-to-r from-mohil-100 via-mohil-400 to-mohil-200
                  text-mohil-800 font-semibold border border-mohil-300
                  hover:from-mohil-200 hover:to-mohil-100
                  focus:outline-none focus:ring-2 focus:ring-mohil-400/60
                  transition-all duration-200
                  group
                  shadow-sm
                `}
                style={{
                  minHeight: "40px"
                }}
              >
                <span className="flex items-center justify-center bg-white/20 rounded-full p-1">
                  <User size={20} className="text-mohil-800 group-hover:text-primary" />
                </span>
                <span className="text-sm font-bold drop-shadow">{user.name}</span>
                <span className="ml-2 text-xs bg-mohil-100 text-mohil-800 rounded px-2 py-0.5 capitalize font-semibold">
                  {user.role}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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

