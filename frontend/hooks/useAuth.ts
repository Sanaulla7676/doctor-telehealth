import { useState, useEffect } from 'react';

export interface UserState {
  isLoggedIn: boolean;
  token: string | null;
  name: string | null;
  email: string | null;
  accountId: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<UserState>({
    isLoggedIn: false,
    token: null,
    name: null,
    email: null,
    accountId: null
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('patientToken');
      const name = localStorage.getItem('patientName') || localStorage.getItem('patientFullName');
      const email = localStorage.getItem('patientEmail');
      const accountId = localStorage.getItem('patientAccountId');

      if (token) {
        setAuth({
          isLoggedIn: true,
          token,
          name,
          email,
          accountId
        });
      }
      setLoading(false);
    }
  }, []);

  const login = (token: string, name: string, email: string, accountId: string) => {
    localStorage.setItem('patientToken', token);
    localStorage.setItem('patientName', name);
    localStorage.setItem('patientEmail', email);
    localStorage.setItem('patientAccountId', accountId);
    setAuth({
      isLoggedIn: true,
      token,
      name,
      email,
      accountId
    });
  };

  const logout = () => {
    localStorage.removeItem('patientToken');
    localStorage.removeItem('patientName');
    localStorage.removeItem('patientEmail');
    localStorage.removeItem('patientAccountId');
    setAuth({
      isLoggedIn: false,
      token: null,
      name: null,
      email: null,
      accountId: null
    });
    window.location.href = '/';
  };

  return { ...auth, loading, login, logout };
}
