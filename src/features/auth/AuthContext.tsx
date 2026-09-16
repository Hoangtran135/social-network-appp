import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { api, setAccessToken, bootstrapAuth, ApiError } from '../../utils/api';
import { getSocket, refreshSocketAuth } from '../../utils/socket';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean | 'banned'>;
  register: (name: string, username: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
  toggleBanUser: (userId: string) => Promise<void>;
  toggleUserRole: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  allUsers: User[];
  refreshAllUsers: () => Promise<void>;
  fetchUserById: (userId: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAllUsers = async () => {
    try {
      const { users } = await api.get<{ users: User[] }>('/users');
      setAllUsers(users);
    } catch {
      // ignore; caller isn't necessarily authenticated yet
    }
  };

  useEffect(() => {
    // On a fresh page load there's no access token in memory yet — silently trade
    // the httpOnly refresh cookie (if any) for one instead of forcing a re-login.
    const init = async () => {
      const ok = await bootstrapAuth();
      if (!ok) {
        setIsLoading(false);
        return;
      }
      try {
        const { user } = await api.get<{ user: User }>('/auth/me');
        setCurrentUser(user);
        await refreshAllUsers();
      } catch {
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean | 'banned'> => {
    try {
      const { accessToken, user } = await api.post<{ accessToken: string; user: User }>('/auth/login', {
        email,
        password: pass,
      });
      setAccessToken(accessToken);
      setCurrentUser(user);
      await refreshAllUsers();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) return 'banned';
      return false;
    }
  };

  const register = async (name: string, username: string, email: string, pass: string): Promise<boolean> => {
    try {
      const { accessToken, user } = await api.post<{ accessToken: string; user: User }>('/auth/register', {
        name,
        username,
        email,
        password: pass,
      });
      setAccessToken(accessToken);
      setCurrentUser(user);
      await refreshAllUsers();
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setCurrentUser(null);
    setAllUsers([]);
  };

  const updateProfile = async (updatedData: Partial<User>) => {
    const { user } = await api.patch<{ user: User }>('/users/me', updatedData);
    setCurrentUser(user);
    setAllUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
  };

  const toggleBanUser = async (userId: string) => {
    const { user } = await api.patch<{ user: User }>(`/users/${userId}/ban`);
    setAllUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
  };

  const toggleUserRole = async (userId: string) => {
    const { user } = await api.patch<{ user: User }>(`/users/${userId}/role`);
    setAllUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
  };

  const blockUser = async (userId: string) => {
    const { user } = await api.post<{ user: User }>(`/users/${userId}/block`);
    setCurrentUser(user);
  };

  const unblockUser = async (userId: string) => {
    const { user } = await api.delete<{ user: User }>(`/users/${userId}/block`);
    setCurrentUser(user);
  };

  // `allUsers` is now a bounded page, not the whole table — this fills in a specific
  // user (e.g. a profile page visit, an incoming call) that page didn't happen to include.
  const fetchUserById = async (userId: string): Promise<User | null> => {
    try {
      const { user } = await api.get<{ user: User }>(`/users/${userId}`);
      setAllUsers((prev) => (prev.some((u) => u.id === userId) ? prev.map((u) => (u.id === userId ? user : u)) : [...prev, user]));
      return user;
    } catch {
      return null;
    }
  };

  // Keeps a second admin's user-management table (or anyone's `allUsers`) in sync when
  // another admin bans/promotes someone — without this it only updates after a reload.
  useEffect(() => {
    if (!currentUser) return;
    refreshSocketAuth();
    const socket = getSocket();
    const onAdminUserUpdate = (data: { user: User }) => {
      setAllUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
    };
    socket.on('admin:user-update', onAdminUserUpdate);
    return () => {
      socket.off('admin:user-update', onAdminUserUpdate);
    };
  }, [currentUser?.id]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin',
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        toggleBanUser,
        toggleUserRole,
        blockUser,
        unblockUser,
        allUsers,
        refreshAllUsers,
        fetchUserById,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
