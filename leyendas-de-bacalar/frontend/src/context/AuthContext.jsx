import { createContext, useContext } from 'react';

const AuthContext = createContext({
  user: null,
  role: 'guest',
  isAuthenticated: false,
});

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: null, role: 'guest', isAuthenticated: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
