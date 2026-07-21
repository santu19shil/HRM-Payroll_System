import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Dev/helper: some runs may accidentally save token under a wrong key (e.g. "accessoken").
  // Normalize it so the rest of the app (axios interceptor, /api/chat auth middleware) works.
  const normalizeTokenKey = () => {
    const correct = localStorage.getItem('accessToken');
    if (correct) return correct;

    const wrong = localStorage.getItem('accessoken');
    if (wrong) {
      localStorage.setItem('accessToken', wrong);
      return wrong;
    }

    return null;
  };

  const loadUser = useCallback(async () => {
    const token = normalizeTokenKey();
    if (!token) {
      setLoading(false);
      return;
    }


    try {
      const response = await authAPI.getMe();
      const userData = response.data.data;
      setUser({
        ...userData,
        unreadLeavesCount: userData.unreadLeavesCount ?? 0,
        unreadDocumentsCount: userData.unreadDocumentsCount ?? 0
      });
      setIsAuthenticated(true);
      const normalizedRole = userData.role || userData.role_name;
      localStorage.setItem('userRole', normalizedRole);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        setUser(null);
        setIsAuthenticated(false);
      }
      // For network/server errors, mark auth as false so protected routes show login
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { accessToken, refreshToken, user: userData } = response.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    const normalizedRole = userData.role || userData.role_name;
    localStorage.setItem('userRole', normalizedRole);
    
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('showFirstLoginModal');
    setUser(null);
    setIsAuthenticated(false);
  };

  const changePassword = async (data) => {
    const response = await authAPI.changePassword(data);

    if (response.data?.success) {
      // Backend updates: is_temp_password = 0, must_change_password = 0
      setUser((prev) => ({
        ...prev,
        is_temp_password: 0,
        must_change_password: 0,
        isFirstLogin: false,
        mustChangePassword: false,
        tempPassword: null
      }));
      localStorage.removeItem('showFirstLoginModal');
    }

    return response.data;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    changePassword,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}