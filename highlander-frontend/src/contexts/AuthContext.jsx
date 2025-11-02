// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { jwtDecode } from 'jwt-decode'; // <-- IMPORT

const AuthContext = createContext(null);

// Funkcja do dekodowania tokena
const decodeToken = (token) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    // Zwracamy tylko potrzebne dane
    return {
      userId: decoded.user_id,
      username: decoded.username,
      is_staff: decoded.is_staff,
    };
  } catch (e) {
    console.error("Błąd dekodowania tokena", e);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // <-- NOWY STAN

  useEffect(() => {
    // Przy starcie aplikacji spróbuj odczytać token z localStorage
    const token = authService.getAccessToken();
    if (token) {
      const decodedUser = decodeToken(token);
      if (decodedUser) {
        setUser(decodedUser);
        setIsLoggedIn(true);
      } else {
        // Token jest zły lub przestarzały
        authService.logout();
      }
    }
    setIsLoading(false); // Zakończ ładowanie
  }, []);

  const login = async (username, password) => {
    try {
      const tokens = await authService.login(username, password);
      const decodedUser = decodeToken(tokens.access);
      if (decodedUser) {
        setUser(decodedUser);
        setIsLoggedIn(true);
      }
    } catch (error) {
      setUser(null);
      setIsLoggedIn(false);
      throw error; 
    }
  };

  const logout = () => {
    authService.logout(); // To przekieruje stronę
    setUser(null);
    setIsLoggedIn(false);
  };

  const value = {
    isLoggedIn,
    isLoading, // <-- Udostępnij stan ładowania
    user, // <-- Udostępnij dane użytkownika
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider');
  }
  return context;
}
