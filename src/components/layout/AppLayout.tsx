import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from './Sidebar';
import Header from './Header';

// Simple error boundary to keep layout visible even if a child errors
class LayoutErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // You can log this if needed
    console.error("Layout error boundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full">
          <div className="mb-2 font-bold text-destructive">Something went wrong in this page.</div>
          <button className="underline" onClick={()=>window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Diagnostic log for mounting layout
  console.log("Rendering AppLayout with sidebar and header");

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Mobile-first: Stack sidebar/header/main on small screens. Row on md+ */}
      <div className="min-h-screen flex flex-col md:flex-row w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-gray-50 md:min-h-0">
          <Header />
          <LayoutErrorBoundary>
            {/* Responsive padding, scrollable but prevents overflow on x axis */}
            <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto max-w-full">
              <div className="max-w-5xl mx-auto w-full">
                <Outlet />
              </div>
            </main>
          </LayoutErrorBoundary>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
