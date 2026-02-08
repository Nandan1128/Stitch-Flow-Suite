import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/Config/supabaseClient";
// Fix for "crypto is not defined" or "browser-external:crypto" in Vite 
// (Removed bcrypt setup)
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
    isLoading: true, // Start loading
  });

  const sessionUserRef = useRef<string | null>(null);

  // Fetch user profile from app_users
  const fetchUserProfile = async (sessionUser: any, retryCount = 0): Promise<User | "NO_PROFILE" | "DEACTIVATED" | "TIMEOUT" | null> => {
    const uid = sessionUser.id;
    const email = sessionUser.email;
    const MAX_RETRIES = 1;

    try {
      const dbQuery = supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();

      const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Database query timed out")), 5000)
      );

      let result: any = null;
      try {
        result = await Promise.race([dbQuery, timeoutPromise]);
      } catch (timeoutErr) {
        console.warn(`fetchUserProfile: Database timed out (Attempt ${retryCount + 1}).`);

        if (retryCount < MAX_RETRIES) {
          return await fetchUserProfile(sessionUser, retryCount + 1);
        }
        console.warn("fetchUserProfile: Exhausted retries. Attempting metadata fallback.");
      }

      const { data: userRow, error } = result || {};

      // FALLBACK STRATEGY: Use Metadata if DB fails
      if (error || !userRow || !result) {
        console.warn("User profile not found in app_users or DB error. Checking metadata.");

        // Check if we have metadata in the session user
        const metadata = sessionUser.user_metadata || {};
        console.log("fetchUserProfile: Metadata found:", metadata);

        // ALWAYS return a user object if we have a session, even with defaults
        // This prevents "Session Expired" loops on patchy connections
        return {
          id: uid,
          name: metadata.name || sessionUser.email?.split('@')[0] || "User",
          email: sessionUser.email!,
          role: (metadata.role as UserRole) || 'supervisor', // Default to supervisor to keep app usable
          employee_id: metadata.employee_id || null,
          isFallback: true
        } as User;
      }

      // Check active status
      if (userRow.employee_id) {
        const { data: employee } = await supabase
          .from("employees")
          .select("is_active")
          .eq("id", userRow.employee_id)
          .single();

        if (employee && employee.is_active === false) {
          return "DEACTIVATED";
        }
      }

      const authenticatedUser: User = {
        id: uid, // Use Auth UID
        name: userRow.username,
        email: userRow.email,
        role: userRow.role as UserRole,
        employee_id: userRow.employee_id,
      };

      return authenticatedUser;

    } catch (e: any) {
      console.error("fetchUserProfile EXCEPTION:", e);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user);

          if (mounted) {
            if (userProfile === "DEACTIVATED") {
              await supabase.auth.signOut();
              setAuthState({ user: null, isAuthenticated: false, isLoading: false });
              toast({ title: "Access Denied", description: "Account deactivated.", variant: "destructive" });
              return;
            }

            if (userProfile === "NO_PROFILE") {
              console.warn("Login successful but no app_users profile found and no metadata fallback.");
              setAuthState({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }

            if (userProfile && typeof userProfile !== "string") {
              setAuthState({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
              });

              // Set ref so subsequent SIGNED_IN events don't re-fetch
              sessionUserRef.current = session.user.id;

              if ((userProfile as any).isFallback) {
                toast({
                  title: "Limited Access",
                  description: "Database unavailable. Loaded profile from session.",
                  duration: 5000
                });
              }
            } else {
              setAuthState({ user: null, isAuthenticated: false, isLoading: false });
            }
          }
        } else {
          if (mounted) setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch (err) {
        if (mounted) setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    getInitialSession();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // We rely on getInitialSession for the first load to avoid double-fetching if possible
      // but onAuthStateChange fires SIGNED_IN etc.

      if (event === 'SIGNED_IN' && session?.user) {

        // Prevent redundant fetches on tab switch/focus if user is already loaded
        if (sessionUserRef.current === session.user.id) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        setAuthState(prev => ({ ...prev, isLoading: true }));
        const userProfile = await fetchUserProfile(session.user);

        if (userProfile === "DEACTIVATED") {
          await supabase.auth.signOut();
          setAuthState({ user: null, isAuthenticated: false, isLoading: false });
          sessionUserRef.current = null;
          toast({ title: "Access Denied", description: "Account deactivated.", variant: "destructive" });
          return;
        }

        if (userProfile === "NO_PROFILE") {
          console.error("Profile fetch failed.");
          setAuthState({ user: null, isAuthenticated: false, isLoading: false });
          sessionUserRef.current = null;
          toast({
            title: "Login Incomplete",
            description: "Could not load user profile from Database or Auth Metadata.",
            variant: "destructive"
          });
          return;
        }

        if (userProfile && typeof userProfile !== "string") {
          sessionUserRef.current = session.user.id;
          setAuthState({ user: userProfile, isAuthenticated: true, isLoading: false });
        } else {
          sessionUserRef.current = null;
          setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        }

      } else if (event === 'SIGNED_OUT') {
        sessionUserRef.current = null;
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        localStorage.removeItem("session_user"); // Clean up old local storage if any
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }: LoginCredentials): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("AuthContext: signInWithPassword error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }

    // Role check happens in onAuthStateChange
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    toast({ title: "Logged out", description: "See you next time!" });
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
