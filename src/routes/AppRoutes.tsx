import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from './index';

const spinner = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const Login      = lazy(() => import('../pages/Login'));
const AdminSetup = lazy(() => import('../pages/AdminSetup'));
const Dashboard  = lazy(() => import('../pages/Dashboard'));
const Profile    = lazy(() => import('../pages/Profile'));
const Chat       = lazy(() => import('../pages/Chat'));
const Finance    = lazy(() => import('../pages/Finance'));
const Invoices   = lazy(() => import('../pages/Invoices'));
const Customers  = lazy(() => import('../pages/Customers'));
const Users      = lazy(() => import('../pages/Users'));
const Company    = lazy(() => import('../pages/CompanyManagers'));

export default function AppRoutes() {
  return (
    <Suspense fallback={spinner}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.ADMIN_SETUP} element={<AdminSetup />} />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.PROFILE}
          element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.CHAT}
          element={
            <ProtectedRoute>
              <Layout><Chat /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.FINANCE}
          element={
            <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
              <Layout><Finance /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.INVOICES}
          element={
            <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
              <Layout><Invoices /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.CUSTOMERS}
          element={
            <ProtectedRoute requiredPermission={{ module: 'customers', action: 'view' }}>
              <Layout><Customers /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.USERS}
          element={
            <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
              <Layout><Users /></Layout>
            </ProtectedRoute>
          }
        />

        {/* manager-only Company page */}
        <Route
          path={ROUTES.COMPANY}
          element={
            <ProtectedRoute>
              <RequireManager>
                <Layout><Company /></Layout>
              </RequireManager>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}

function RequireManager({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'manager') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <>{children}</>;
}
