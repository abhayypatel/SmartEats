import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import apiService from "../utils/apiService";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  goals: {
    dailyCalories: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
};

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("smarteats_token");

      if (token) {
        try {
          if (token.startsWith("demo-jwt-token-")) {
            const mockUser: User = {
              id: "demo-user",
              email: "demo@smarteats.com",
              firstName: "Demo",
              lastName: "User",
              avatar: "",
              goals: {
                dailyCalories: 2000,
                macros: {
                  protein: 150,
                  carbs: 250,
                  fat: 67,
                },
              },
            };
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: mockUser, token },
            });
            return;
          }

          const response = await apiService.getProfile();
          if (response.success && response.data) {
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: response.data.user, token },
            });
          } else {
            localStorage.removeItem("smarteats_token");
            dispatch({ type: "LOGOUT" });
          }
        } catch (error) {
          console.error("Error checking auth:", error);
          localStorage.removeItem("smarteats_token");
          dispatch({ type: "LOGOUT" });
        }
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await apiService.login(email, password);

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      // Extract token from response data
      const authToken =
        (response.data as any)?.token || (response as any).token;
      const userData = response.data?.user || response.data;

      if (!authToken) {
        throw new Error("No authentication token received");
      }

      localStorage.setItem("smarteats_token", authToken);

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: userData, token: authToken },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await apiService.register(userData);

      if (!response.success) {
        throw new Error(response.message || "Registration failed");
      }

      // Extract token from response data
      const authToken =
        (response.data as any)?.token || (response as any).token;
      const userInfo = response.data?.user || response.data;

      if (!authToken) {
        throw new Error("No authentication token received");
      }

      localStorage.setItem("smarteats_token", authToken);

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: userInfo, token: authToken },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // No need to call logout API for demo or if it fails
      localStorage.removeItem("smarteats_token");
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      localStorage.removeItem("smarteats_token");
      dispatch({ type: "LOGOUT" });
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const token = localStorage.getItem("smarteats_token");

      if (!token || token.startsWith("demo-jwt-token-")) {
        if (state.user) {
          dispatch({ type: "UPDATE_USER", payload: userData });
        }
        return;
      }

      const response = await apiService.updateProfile(userData);
      if (response.success && response.data) {
        dispatch({ type: "UPDATE_USER", payload: response.data.user });
      }
    } catch (error) {
      console.error("Update user error:", error);
      // Still update locally if API fails
      if (state.user) {
        dispatch({ type: "UPDATE_USER", payload: userData });
      }
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
