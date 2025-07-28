// src/components/MemberLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, DollarSign, FileText, LogOut, Menu, ChevronDown, Users } from 'lucide-react';
import logo from '../assets/logo.png';

const MemberLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionStr = localStorage.getItem('memberSession');
  const session    = sessionStr ? JSON.parse(sessionStr) : null;
  const location   = useLocation();
  const navigate   = useNavigate();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const navItems = [
    { name: 'Dashboard', href: '/members/dashboard', icon: Home },
    { name: 'Finance',   href: '/members/finance',   icon: DollarSign },
    { name: 'Claims',    href: '/members/claims',    icon: FileText },
  ] as const;

  const isActive = (href: string) =>
    location.pathname === href;

  const logout = () => {
    localStorage.removeItem('memberSession');
    navigate('/members/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="px-4 flex items-center justify-between h-16">
          <Link to="/members/dashboard" className="flex items-center space-x-2">
            <img src={logo} alt="Logo" className="h-8" />
            <span className="font-bold">Member Portal</span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-1" />
                  {item.name}
                </Link>
              );
            })}

            <div className="relative">
              <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                  {session.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-gray-800">{session.fullName}</span>
                <ChevronDown className={`w-4 h-4 transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md w-40 py-1">
                  <Link
                    to="/members/profile"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* mobile */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpen(o => !o)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {open && (
          <div className="md:hidden bg-white shadow">
            {navItems.map(item => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <Link
              to="/members/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Profile
            </Link>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="p-4">
        {children}
      </main>
    </div>
  );
};

export default MemberLayout;
