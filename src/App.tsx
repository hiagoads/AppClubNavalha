import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ClientPanel from './pages/ClientPanel';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ClientAuth from './pages/ClientAuth';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-carbon flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="glass-card max-w-md p-8 border border-white/10 rounded-2xl bg-carbon-light">
            <h2 className="text-xl font-bold font-display text-gold mb-2">Ops! Algo deu errado</h2>
            <p className="text-sm text-white/60 mb-6">
              Ocorreu uma instabilidade na exibição desta tela. Clique abaixo para recarregar o aplicativo.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="w-full gold-gradient text-carbon font-bold py-3 px-6 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-carbon flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
    </div>
  );

  if (!user || !isAdmin) return <Navigate to="/login" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
        <Routes>
          <Route path="/" element={<ClientPanel />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/clube" element={<ClientAuth />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
