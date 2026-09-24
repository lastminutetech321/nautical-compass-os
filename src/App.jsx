import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth-context';
import { queryClient } from './lib/query-client';

// Layout
import Layout from './components/Layout';

// Auth pages
import Login from './pages/auth/login';
import Signup from './pages/auth/signup';
import ForgotPassword from './pages/auth/forgot-password';
import ResetPassword from './pages/auth/reset-password';

// Public pages
import Home from './pages/home';
import About from './pages/about';
import Privacy from './pages/privacy';
import Terms from './pages/terms';
import Support from './pages/support';

// Apply pages
import BusinessServiceOpenPilot from './pages/apply/business-service-open-pilot';

// Dashboard
import Dashboard from './pages/dashboard';

// Protected route wrapper
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="support" element={<Support />} />
              
              {/* Apply routes */}
              <Route path="apply/business-service-open-pilot" element={<BusinessServiceOpenPilot />} />
              
              {/* Auth routes */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              
              {/* Protected routes */}
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
