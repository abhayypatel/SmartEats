import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";

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

interface RegisteredUser extends User {
  password: string;
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

const getRegisteredUsers = (): RegisteredUser[] => {
  const users = localStorage.getItem("smarteats_users");
  return users ? JSON.parse(users) : [];
};

const saveRegisteredUsers = (users: RegisteredUser[]) => {
  localStorage.setItem("smarteats_users", JSON.stringify(users));
};

const findUserByEmail = (email: string): RegisteredUser | null => {
  const users = getRegisteredUsers();
  return users.find((user) => user.email === email) || null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("smarteats_token");
      const userData = localStorage.getItem("smarteats_current_user");

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: { user, token },
          });
        } catch (error) {
          console.error("Error restoring auth state:", error);
          localStorage.removeItem("smarteats_token");
          localStorage.removeItem("smarteats_current_user");
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

      // Check for demo account
      if (email === "demo@smarteats.com" && password === "demo123") {
        const mockToken = "demo-jwt-token-" + Date.now();
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

        localStorage.setItem("smarteats_token", mockToken);
        localStorage.setItem(
          "smarteats_current_user",
          JSON.stringify(mockUser),
        );
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: mockUser, token: mockToken },
        });
        return;
      }

      // Check for registered users
      const registeredUser = findUserByEmail(email);
      if (registeredUser && registeredUser.password === password) {
        const token = "user-jwt-token-" + Date.now();
        const { password: _, ...userWithoutPassword } = registeredUser;

        localStorage.setItem("smarteats_token", token);
        localStorage.setItem(
          "smarteats_current_user",
          JSON.stringify(userWithoutPassword),
        );
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: userWithoutPassword, token },
        });
        return;
      }

      // Invalid credentials
      throw new Error("Invalid credentials");
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Check if email already exists
      const existingUser = findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error("An account with this email already exists");
      }

      // Create new user
      const newUser: RegisteredUser = {
        id: "user-" + Date.now(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
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

      // Save to registered users
      const users = getRegisteredUsers();
      users.push(newUser);
      saveRegisteredUsers(users);

      // Log the user in
      const token = "user-jwt-token-" + Date.now();
      const { password: _, ...userWithoutPassword } = newUser;

      localStorage.setItem("smarteats_token", token);
      localStorage.setItem(
        "smarteats_current_user",
        JSON.stringify(userWithoutPassword),
      );

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: userWithoutPassword, token },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("smarteats_token");
    localStorage.removeItem("smarteats_current_user");
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem(
        "smarteats_current_user",
        JSON.stringify(updatedUser),
      );
      dispatch({ type: "UPDATE_USER", payload: userData });
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
