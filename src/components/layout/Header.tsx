
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
import { User, Settings, LogOut } from 'lucide-react';

const LOGO_SRC = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=48&q=80";

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <img
              src={LOGO_SRC}
              alt="StitchFlow Suite Logo"
              className="h-8 w-8 rounded-xl shadow-lg object-cover border border-border"
            />
            <h1
              className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-sans leading-tight"
              style={{
                // The font matches sidebar, if you wish to use another like 'playfair', set up accordingly in tailwind
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
                  flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-primary via-secondary to-accent
                  text-white font-semibold shadow-md border-2 border-primary
                  hover:from-accent hover:to-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/60
                  transition-all duration-200
                  group
                `}
              >
                <span className="flex items-center justify-center bg-white/30 rounded-full p-1">
                  <User size={20} className="text-white group-hover:text-primary" />
                </span>
                <span className="text-sm font-bold drop-shadow">{user.name}</span>
                <span className="ml-2 text-xs bg-white/10 rounded px-2 py-0.5 capitalize font-semibold">
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
