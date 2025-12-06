import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/Config/supabaseClient";
import bcrypt from "bcryptjs";
import { User, LoginCredentials, AuthState, UserRole } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  // Load user session when app starts
  useEffect(() => {
    const storedUser = localStorage.getItem("session_user");
    if (storedUser) {
      setAuthState({
        user: JSON.parse(storedUser),
        isAuthenticated: true,
        isLoading: false,
      });
    }
  }, []);

  // ⭐ LOGIN FUNCTION
  const login = async ({
    email,
    password,
  }: LoginCredentials): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));


    try {
      // Fetch user from app_users table
      const { data: userRow, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();



      if (error || !userRow) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });

        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // check whether user is active
      if (userRow.employee_id) {
        const { data: employee, error: empErr } = await supabase
          .from("employees")
          .select("is_active")
          .eq("id", userRow.employee_id)
          .single();

        if (empErr || !employee) {
          toast({
            title: "Login Failed",
            description: "Account data not found",
            variant: "destructive",
          });
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return false;
        }

        if (employee.is_active === false) {
          toast({
            title: "Access Denied",
            description: "Your account has been deactivated. Contact admin.",
            variant: "destructive",
          });
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return false;
        }
      }

      // Compare password using bcryptjs
      const isMatch = await bcrypt.compare(
        password,
        userRow.password_hash || ""
      );

      if (!isMatch) {
        toast({
          title: "Login Failed",
          description: "Incorrect password",
          variant: "destructive",
        });

        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // Build logged-in user object
      const authenticatedUser: User = {
        id: userRow.id,
        name: userRow.username,
        email: userRow.email,
        role: userRow.role as UserRole,
        employee_id: userRow.employee_id,
      };

      // Save session to localStorage
      localStorage.setItem("session_user", JSON.stringify(authenticatedUser));

      setAuthState({
        user: authenticatedUser,
        isAuthenticated: true,
        isLoading: false,
      });

      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });

      return true;
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong during login",
        variant: "destructive",
      });
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // ⭐ LOGOUT FUNCTION
  const logout = () => {
    localStorage.removeItem("session_user");

    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside an AuthProvider");
  return context;
};
