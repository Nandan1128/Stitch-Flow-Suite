
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import AppLayout from "./components/layout/AppLayout";

// Pages
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Employees from "./pages/Employees";
import Workers from "./pages/Workers";
import Products from "./pages/Products";
import Production from "./pages/Production";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Salary from "./pages/Salary";
import Index from "./pages/Index";
import AdminProfile from "./pages/AdminProfile";
import SupervisorProfile from "./pages/SupervisorProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public homepage */}
            <Route path="/" element={<Index />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes with AppLayout */}
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="workers" element={<Workers />} />
              <Route path="products" element={<Products />} />
              <Route path="production" element={<Production />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="salary" element={<Salary />} />
              <Route path="admin-profile" element={<AdminProfile />} />
              <Route path="supervisor-profile" element={<SupervisorProfile />} />
            </Route>

            {/* Redirect from top-level to dashboard nested route */}
            <Route path="/employees" element={<Navigate to="/dashboard/employees" replace />} />
            <Route path="/workers" element={<Navigate to="/dashboard/workers" replace />} />
            <Route path="/products" element={<Navigate to="/dashboard/products" replace />} />
            <Route path="/production" element={<Navigate to="/dashboard/production" replace />} />
            <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
            <Route path="/salary" element={<Navigate to="/dashboard/salary" replace />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
