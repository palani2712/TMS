import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

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

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const jwt = await firebaseUser.getIdToken();
      sessionStorage.setItem('token', jwt);
      
      const response = await API.get('/users/me', {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      const { id, username, role, passwordResetAllowed } = response.data;
      const userData = { id, username, role, passwordResetAllowed };

      sessionStorage.setItem('user', JSON.stringify(userData));
      setToken(jwt);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      let message = "Invalid email or password.";
      if (error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
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

  const forgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Password reset failed:", error);
      return {
        success: false,
        message: error.message || "Could not send reset email.",
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateProfile, forgotPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
