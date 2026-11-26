import { createContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import LoadingState from "../pages/admin/LoadingState";
import { useClerk } from "@clerk/react";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { signOut: clerkSignOut, isSignedIn } = useClerk();

const checkAuth = async () => {
  try {
    const res = await axiosInstance.get("/auth/check", {
      withCredentials: true,
    });

    setUser(res.data);
  } catch (error) {
    console.error("AUTH CHECK ERROR:", error.response?.data || error);
    setUser(null);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    checkAuth();
  }, []);


  const signup = async (data) => {
    const res = await axiosInstance.post("/auth/signup", data, {
      withCredentials: true,
    });
    setUser(res.data);
    return res.data;
  };

  const signin = async (data) => {
    const res = await axiosInstance.post("/auth/login", data, {
      withCredentials: true,
    });
    setUser(res.data);
    return res.data;
  };

 
  const signout = async () => {
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });

      if (isSignedIn) {
        await clerkSignOut();
      }
      
      setUser(null);
        localStorage.clear();
    sessionStorage.clear();
    
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <AuthContext.Provider value={{ user, setUser, signup, signin, signout }}>
      {children}
    </AuthContext.Provider>
  );
}
