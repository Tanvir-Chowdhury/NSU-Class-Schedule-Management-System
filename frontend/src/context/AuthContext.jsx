import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Fetch user profile on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Decode token to restore user session
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');
        
        const payload = JSON.parse(atob(parts[1]));
        // Check if token is expired
        if (payload.exp * 1000 < Date.now()) {
          throw new Error('Token expired');
        }
        
        // Fetch full profile to get name
        const response = await axios.get('http://localhost:8000/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000 // Add timeout to prevent hanging
        });
        
        setUser({ 
          email: payload.sub, 
          role: payload.role,
          full_name: response.data.full_name,
          profile_picture: response.data.profile_picture
        });
      } catch (error) {
        console.error("Failed to restore user session", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      
      setToken(access_token);
      
      // Decode token to get user info
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      
      // Fetch full profile immediately after login
      const profileRes = await axios.get('http://localhost:8000/profile/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userData = { 
        email: payload.sub, 
        role: payload.role,
        full_name: profileRes.data.full_name,
        profile_picture: profileRes.data.profile_picture
      };
      setUser(userData); 
      
      return userData;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
