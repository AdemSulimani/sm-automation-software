import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, ProtectedRoute, AdminRoute } from './components';
import {
  Login,
  Register,
  Landing,
  Privacy,
  Terms,
  Dashboard,
  Klientet,
  ClientSettings,
  Channels,
  ChannelDetail,
  Inbox,
  InboxThread,
  Contacts,
  ContactDetail,
  Automation,
  KeywordResponses,
  Settings,
  Profile,
  Business,
  Statistics,
} from './pages';

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="auth-loading">Duke ngarkuar…</div>;
  if (token) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function LandingOrRedirect() {
  const { token, loading } = useAuth();
  if (loading) return <div className="auth-loading">Duke ngarkuar…</div>;
  if (token) return <Navigate to="/app" replace />;
  return <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingOrRedirect />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="klientet" element={<AdminRoute><Klientet /></AdminRoute>} />
        <Route path="klientet/:userId/cilesime" element={<AdminRoute><ClientSettings /></AdminRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="business" element={<Business />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="channels" element={<Channels />} />
        <Route path="channels/:channelId" element={<ChannelDetail />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="inbox/:conversationId" element={<InboxThread />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:contactId" element={<ContactDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="automation" element={<Automation />} />
        <Route path="keyword-responses" element={<KeywordResponses />} />
        <Route path="chatbot" element={<Navigate to="/app/channels" replace />} />
        <Route path="manual-reply" element={<Navigate to="/app/inbox" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
