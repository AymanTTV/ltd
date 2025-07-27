import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  Home,
  DollarSign,
  FileText,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  ChevronDown,
  Building,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import logo from '../assets/logo.png';
import MobileMenu from './navigation/MobileMenu';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { ROUTES } from '../routes';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: { module: string; action: string };
  managerOnly?: boolean;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Timestamp | null>(null);

  // Listen for lastReadTimestamp for chat notifications
  useEffect(() => {
    if (!user?.id) return;
    const ref = doc(db, 'users', user.id);
    const unsub = onSnapshot(ref, snap => {
      setLastReadTimestamp((snap.data() as any)?.lastReadTimestamp || null);
    });
    return () => unsub();
  }, [user?.id]);

  // Listen for unread messages
  useEffect(() => {
    if (!user?.id) return;
    let q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    if (lastReadTimestamp) {
      q = query(
        collection(db, 'messages'),
        where('timestamp', '>', lastReadTimestamp),
        orderBy('timestamp', 'desc')
      );
    }
    const unsub = onSnapshot(q, snap => {
      const count = snap.docs.filter(d => {
        const m = d.data() as any;
        const ts = m.timestamp?.toDate() || new Date();
        const own = m.sender.id === user.id;
        const older = lastReadTimestamp ? ts <= lastReadTimestamp.toDate() : false;
        return !own && !older;
      }).length;
      setUnreadChatCount(count);
    });
    return () => unsub();
  }, [user?.id, lastReadTimestamp]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate(ROUTES.LOGIN);
  };

  const isActiveRoute = (href: string) => {
    const p = location.pathname;
    return href === p || (href !== '/' && p.startsWith(href));
  };

  const rawNav: NavItem[] = [
    { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: Home },
    { name: 'Finance', href: ROUTES.FINANCE, icon: DollarSign, permission: { module: 'finance', action: 'view' } },
    { name: 'Claim', href: ROUTES.INVOICES, icon: FileText, permission: { module: 'finance', action: 'view' } },
    { name: 'Members', href: ROUTES.CUSTOMERS, icon: Users, permission: { module: 'customers', action: 'view' } },
    { name: 'Chat', href: ROUTES.CHAT, icon: MessageSquare },
    { name: 'Users', href: ROUTES.USERS, icon: Users, permission: { module: 'users', action: 'view' } },
    { name: 'Company', href: ROUTES.COMPANY, icon: Building, managerOnly: true },
  ];

  const navigation = rawNav.filter(item => {
    if (item.permission && !can(item.permission.module, item.permission.action)) {
      return false;
    }
    if (item.managerOnly && user?.role !== 'manager') {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={ROUTES.DASHBOARD} className="flex-shrink-0">
              <img
                src={logo}
                alt="London Taxi Association"
                className="h-10 w-auto"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map(item => {
                const Icon = item.icon;
                const active = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'text-primary bg-primary/5'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-1.5" />
                    <span>{item.name}</span>
                    {item.name === 'Chat' && unreadChatCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">
                        {unreadChatCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Menu & Mobile Toggle */}
            <div className="flex items-center">
              {/* User */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to={ROUTES.PROFILE}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden ml-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigation}
        currentPath={location.pathname}
        unreadChatCount={unreadChatCount}
      />

      {/* Main content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default Layout;
