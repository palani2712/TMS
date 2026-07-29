import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';
import { auth } from '../config/firebase';
import { signInWithCustomToken, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const jwt = await firebaseUser.getIdToken();
          sessionStorage.setItem('token', jwt);
          
          // Get user profile details from backend
          const response = await API.get('/users/me', {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          const { id, username, role, passwordResetAllowed } = response.data;
          const userData = { id, username, role, passwordResetAllowed };

          sessionStorage.setItem('user', JSON.stringify(userData));
          setToken(jwt);
          setUser(userData);
        } catch (error) {
          console.error("Failed to restore Firebase session:", error);
          logout();
        }
      } else {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await API.post('/auth/login', { username, password });
      const { token: customToken, id, username: returnedUsername, role, passwordResetAllowed } = response.data;

      const userCredential = await signInWithCustomToken(auth, customToken);
      const firebaseUser = userCredential.user;
      const jwt = await firebaseUser.getIdToken();
      sessionStorage.setItem('token', jwt);
      
      const userData = { id, username: returnedUsername, role, passwordResetAllowed };
      sessionStorage.setItem('user', JSON.stringify(userData));
      setToken(jwt);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      let message = "Invalid username or password.";
      if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      return {
        success: false,
        message,
      };
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updatedUser) => {
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const forgotPassword = async (username) => {
    try {
      const response = await API.post('/auth/forgot-password/request', { username });
      return { success: true, message: response.data };
    } catch (error) {
      console.error("Password reset request failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data || error.message || "Could not request password reset.",
      };
    }
  };

  const verifyResetOtp = async (username, otp, newPassword) => {
    try {
      const response = await API.post('/auth/forgot-password/verify', { username, otp, newPassword });
      return { success: true, message: response.data };
    } catch (error) {
      console.error("OTP verification failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data || error.message || "Failed to verify OTP.",
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateProfile, forgotPassword, verifyResetOtp, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
