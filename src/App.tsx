
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { UserStatusProvider, useUserStatus } from "./contexts/UserStatusContext";
import ChatWidget from "./components/ChatWidget";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Entradas from "./pages/Entradas";
import Saidas from "./pages/Saidas";
import Notinhas from "./pages/Notinhas";
import Graficos from "./pages/Graficos";
import Tabelas from "./pages/Tabelas";
import Impostos from "./pages/Impostos";
import Config from "./pages/Config";
import Blocked from "./pages/Blocked";
import Payment from "./pages/Payment";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isBlocked, needsPayment, loading: statusLoading } = useUserStatus();
  
  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isBlocked) {
    return <Navigate to="/blocked" replace />;
  }

  if (needsPayment) {
    return <Navigate to="/payment" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/blocked" element={<Blocked />} />
    <Route path="/payment" element={<Payment />} />
    <Route path="/admin-panel" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/entradas" element={<ProtectedRoute><Entradas /></ProtectedRoute>} />
    <Route path="/saidas" element={<ProtectedRoute><Saidas /></ProtectedRoute>} />
    <Route path="/notinhas" element={<ProtectedRoute><Notinhas /></ProtectedRoute>} />
    <Route path="/graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />
    <Route path="/tabelas" element={<ProtectedRoute><Tabelas /></ProtectedRoute>} />
    <Route path="/impostos" element={<ProtectedRoute><Impostos /></ProtectedRoute>} />
    <Route path="/config" element={<ProtectedRoute><Config /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppWithChat = () => {
  const { user } = useAuth();
  const { isBlocked, needsPayment } = useUserStatus();
  
  return (
    <>
      <AppRoutes />
      {user && !isBlocked && !needsPayment && <ChatWidget />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <UserStatusProvider>
              <AppWithChat />
            </UserStatusProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
