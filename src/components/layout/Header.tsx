import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b h-16 flex items-center justify-end px-4">
      <div className="flex items-center gap-2">
        {user && (
          <Link
            to={
              user.role === "admin"
                ? "/dashboard/admin-profile"
                : "/dashboard/supervisor-profile"
            }
            className="inline-flex items-center px-3 py-1 rounded hover:bg-muted transition"
          >
            <span className="mr-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20c0-2 4-3 6-3 2 0 6 1 6 3v1H6v-1Z"/>
              </svg>
            </span>
            <span className="text-sm">{user.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
};
export default Header;
