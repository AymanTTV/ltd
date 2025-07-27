// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ROUTES } from '../routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: string;  // <-- was `keyof RolePermissions`
    action: 'view' | 'create' | 'update' | 'delete';
  };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const { user, loading: authLoading } = useAuth();
  const { can, loading: permissionsLoading } = usePermissions();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (requiredPermission) {
    if (permissionsLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
        </div>
      );
    }

    if (!can(requiredPermission.module, requiredPermission.action)) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
