import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('siv_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('siv_token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    return savedToken || null;
  });

  const login = async (usuario, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { usuario, password });
      const newToken = response.data.token;
      const newUser = response.data.usuario;

      localStorage.setItem('siv_token', newToken);
      localStorage.setItem('siv_user', JSON.stringify(newUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      setToken(newToken);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
        return { 
        success: false, 
        message: error.response?.data?.mensaje || 'Error de conexión'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('siv_token');
    localStorage.removeItem('siv_user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
