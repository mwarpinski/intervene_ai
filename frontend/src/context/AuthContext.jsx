import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE = 'http://localhost:8000/api/v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('intervene_auth_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate stored JWT token on app start
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token invalid or expired
          localStorage.removeItem('intervene_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth check error (backend may be offline):', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  const login = async (email, password, captchaToken) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        captcha_token: captchaToken || '1x0000000000000000000000000000000AA'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed. Please check your credentials.');
    }

    localStorage.setItem('intervene_auth_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (signupData) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...signupData,
        captcha_token: signupData.captcha_token || '1x0000000000000000000000000000000AA'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Signup failed. Please try again.');
    }

    localStorage.setItem('intervene_auth_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('intervene_auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
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
