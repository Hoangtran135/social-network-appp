import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { SocialProvider } from './context/SocialContext';
import { CallProvider } from './features/calls/CallContext';
import { CallModal } from './features/calls/CallModal';
import { ConfirmDialogProvider } from './common/ConfirmDialogProvider';

// Layouts
import { MainLayout } from './layout/MainLayout';
import { AdminLayout } from './layout/AdminLayout';

// Auth Pages
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';

// User Pages
import { FeedPage } from './features/feed/FeedPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProfileEditPage } from './features/profile/ProfileEditPage';
import { FriendsPage } from './features/friends/FriendsPage';
import { GroupsPage } from './features/groups/GroupsPage';
import { GroupDetailPage } from './features/groups/GroupDetailPage';
import { MessagesPage } from './features/messages/MessagesPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { SavedPostsPage } from './features/saved/SavedPostsPage';
import { SearchPage } from './features/search/SearchPage';
import { SettingsPage } from './features/settings/SettingsPage';

// Admin Pages
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { AdminPostsPage } from './features/admin/AdminPostsPage';
import { AdminCommentsPage } from './features/admin/AdminCommentsPage';
import { AdminGroupsPage } from './features/admin/AdminGroupsPage';
import { AdminReportsPage } from './features/admin/AdminReportsPage';
import { AdminAnnouncementsPage } from './features/admin/AdminAnnouncementsPage';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100">
    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <ConfirmDialogProvider>
      <AuthProvider>
        <SocialProvider>
          <CallProvider>
          <CallModal />
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* User Main Network Routes */}
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<FeedPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/settings/profile" element={<ProfileEditPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:id" element={<GroupDetailPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:conversationId" element={<MessagesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/saved" element={<SavedPostsPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Route>

            {/* Admin Management Routes */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="posts" element={<AdminPostsPage />} />
              <Route path="comments" element={<AdminCommentsPage />} />
              <Route path="groups" element={<AdminGroupsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="notifications" element={<AdminAnnouncementsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </CallProvider>
        </SocialProvider>
      </AuthProvider>
      </ConfirmDialogProvider>
    </BrowserRouter>
  );
}

export default App;
