// src/routes/index.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

// Lazy load pages
const Login      = React.lazy(() => import('../pages/Login'));
const AdminSetup = React.lazy(() => import('../pages/AdminSetup'));
const Dashboard  = React.lazy(() => import('../pages/Dashboard'));
const Profile    = React.lazy(() => import('../pages/Profile'));
const Chat       = React.lazy(() => import('../pages/Chat'));
const Finance    = React.lazy(() => import('../pages/Finance'));
const Invoices   = React.lazy(() => import('../pages/Invoices'));
const Customers  = React.lazy(() => import('../pages/Customers'));
const Users      = React.lazy(() => import('../pages/Users'));  // ← added!
const Company    = React.lazy(() => import('../pages/Company'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"       element={<Login />} />
      <Route path="/admin-setup" element={<AdminSetup />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance"
        element={
          <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
            <Layout>
              <Finance />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices"
        element={
          <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
            <Layout>
              <Invoices />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredPermission={{ module: 'customers', action: 'view' }}>
            <Layout>
              <Customers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"              // ← new route
        element={
          <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Company (manager only) */}
     <Route
       path="/company"
       element={
         <ProtectedRoute requiredPermission={{ module: 'company', action: 'view' }}>
           <Layout>
             <Company />
           </Layout>
         </ProtectedRoute>
       }
     />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
