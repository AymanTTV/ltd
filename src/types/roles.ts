// src/types/roles.ts

export type Role = 'admin' | 'manager' | 'finance' | 'claims';

export interface Permission {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  cards: boolean;      // ← new flag controlling whether summary-cards show
}

export interface RolePermissions {
  dashboard: Permission;
  finance:   Permission;
  invoices:  Permission;
  customers: Permission;
  users:     Permission;
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissions> = {
  manager: {
    dashboard: { view: true,  create: true,  update: true,  delete: true,  cards: true },
    finance:   { view: true,  create: true,  update: true,  delete: true,  cards: true },
    invoices:  { view: true,  create: true,  update: true,  delete: true,  cards: true },
    customers: { view: true,  create: true,  update: true,  delete: true,  cards: true },
    users:     { view: true,  create: true,  update: true,  delete: true,  cards: true },
  },
  admin: {
    dashboard: { view: true,  create: false, update: true,  delete: false, cards: true },
    finance:   { view: true,  create: false, update: false, delete: false, cards: true },
    invoices:  { view: true,  create: true,  update: true,  delete: true,  cards: true },
    customers: { view: true,  create: false, update: false, delete: false, cards: true },
    users:     { view: true,  create: false, update: false, delete: false, cards: true },
  },
  finance: {
    dashboard: { view: true,  create: false, update: false, delete: false, cards: true },
    finance:   { view: true,  create: true,  update: true,  delete: false, cards: true },
    invoices:  { view: true,  create: true,  update: true,  delete: true,  cards: true },
    customers: { view: true,  create: false, update: false, delete: false, cards: true },
    users:     { view: false, create: false, update: false, delete: false, cards: false },
  },
  claims: {
    dashboard: { view: true,  create: false, update: false, delete: false, cards: false },
    finance:   { view: false, create: false, update: false, delete: false, cards: false },
    invoices:  { view: true,  create: true,  update: true,  delete: true,  cards: false },
    customers: { view: true,  create: true,  update: true,  delete: false, cards: false },
    users:     { view: false, create: false, update: false, delete: false, cards: false },
  },
};

export function getDefaultPermissions(role: Role): RolePermissions {
  return DEFAULT_PERMISSIONS[role];
}
