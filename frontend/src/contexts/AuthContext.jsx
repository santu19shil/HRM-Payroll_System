import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
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
      // For network/server errors, keep the user logged in and retry later
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
    if (response.data.success) {
      setUser(prev => ({ ...prev, isFirstLogin: false, tempPassword: null }));
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