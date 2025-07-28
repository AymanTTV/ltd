// src/routes/AppRoutes.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MemberLayout from '../components/MemberLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from './index';

const spinner = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// — Admin Pages —
const Login       = lazy(() => import('../pages/Login'));
const AdminSetup  = lazy(() => import('../pages/AdminSetup'));
const Dashboard   = lazy(() => import('../pages/Dashboard'));
const Profile     = lazy(() => import('../pages/Profile'));
const Chat        = lazy(() => import('../pages/Chat'));
const Finance     = lazy(() => import('../pages/Finance'));
const Invoices    = lazy(() => import('../pages/Invoices'));
const Customers   = lazy(() => import('../pages/Customers'));
const Users       = lazy(() => import('../pages/Users'));
const Company     = lazy(() => import('../pages/CompanyManagers'));

// — Member Pages —
const MemberAuth      = lazy(() => import('../pages/members/MembersAuth'));
const MemberLogin     = lazy(() => import('../pages/members/MemberLogin'));
const MemberRegister  = lazy(() => import('../pages/members/Register'));
const MemberDashboard = lazy(() => import('../pages/members/MemberDashboard'));
const MemberProfile   = lazy(() => import('../pages/members/MemberProfile'));
const MemberFinance   = lazy(() => import('../pages/members/MemberFinance'));
const MemberClaims    = lazy(() => import('../pages/members/MemberClaims'));

export default function AppRoutes() {
  // pull our badgeNumber out of localStorage for the member
  const sessionStr  = localStorage.getItem('memberSession');
  const badgeNumber = sessionStr ? JSON.parse(sessionStr).badgeNumber : undefined;

  return (
    <Suspense fallback={spinner}>
      <Routes>

        {/* — Admin Portal — */}
        <Route path={ROUTES.LOGIN}      element={<Login />} />
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

        {/* — Member Portal — */}
        <Route path="/members/auth"     element={<MemberAuth />} />
        <Route path="/members/login"    element={<MemberLogin />} />
        <Route path="/members/register" element={<MemberRegister />} />

        <Route
          path="/members/dashboard"
          element={
            <RequireMember>
              <MemberLayout>
                <MemberDashboard
                  filterByBadge={badgeNumber}
                  memberMode
                />
              </MemberLayout>
            </RequireMember>
          }
        />

        <Route
          path="/members/finance"
          element={
            <RequireMember>
              <MemberLayout>
                <MemberFinance
                  filterByBadge={badgeNumber}
                  memberMode
                />
              </MemberLayout>
            </RequireMember>
          }
        />

        <Route
          path="/members/claims"
          element={
            <RequireMember>
              <MemberLayout>
                <MemberClaims
                  filterByBadge={badgeNumber}
                  memberMode
                />
              </MemberLayout>
            </RequireMember>
          }
        />

        <Route
          path="/members/profile"
          element={
            <RequireMember>
              <MemberLayout>
                <MemberProfile />
              </MemberLayout>
            </RequireMember>
          }
        />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}

// Admin-only guard
function RequireManager({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'manager'
    ? <>{children}</>
    : <Navigate to={ROUTES.DASHBOARD} replace />;
}

// Member-only guard
function RequireMember({ children }: { children: React.ReactNode }) {
  const session = localStorage.getItem('memberSession');
  return session
    ? <>{children}</>
    : <Navigate to="/members/login" replace />;
}
