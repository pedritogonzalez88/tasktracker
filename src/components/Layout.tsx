import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import AuthScreen from './AuthScreen';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BarChart3, 
  FileText, 
  User, 
  Settings as SettingsIcon, 
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useSettings();

  if (!user) {
    return <AuthScreen />;
  }

  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/calendar', icon: CalendarDays, label: t('calendar') },
    { to: '/projects', icon: FolderOpen, label: t('projects') },
    { to: '/analytics', icon: BarChart3, label: t('analytics') },
    { to: '/notes', icon: FileText, label: t('notes') },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors">
      {/* Sidebar */}
      <aside className="w-[240px] bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 px-6 py-6 text-white transition-colors">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h1 className="text-[1.2rem] font-bold tracking-tight text-white leading-none">TaskTracker</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[1px] text-slate-500 font-bold mb-3">{t('principal')}</p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors mb-1",
                      isActive 
                        ? "bg-slate-800 dark:bg-slate-800 text-white font-medium" 
                        : "text-slate-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/80 hover:text-white"
                    )
                  }
                >
                  <Icon size={18} />
                  <span className="text-sm">{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[1px] text-slate-500 font-bold mb-3">{t('account')}</p>
            <NavLink 
              to="/profile" 
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors mb-1",
                  isActive 
                    ? "bg-slate-800 dark:bg-slate-800 text-white font-medium" 
                    : "text-slate-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/80 hover:text-white"
                )
              }
            >
              <User size={18} />
              <span className="text-sm font-medium">{t('profile')}</span>
            </NavLink>
            <NavLink 
              to="/settings" 
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors mb-1",
                  isActive 
                    ? "bg-slate-800 dark:bg-slate-800 text-white font-medium" 
                    : "text-slate-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/80 hover:text-white"
                )
              }
            >
              <SettingsIcon size={18} />
              <span className="text-sm font-medium">{t('settings')}</span>
            </NavLink>
          </div>
        </nav>

        <div className="pt-4 mt-auto">
          <div className="flex items-center gap-3 p-2 group cursor-pointer border border-transparent hover:border-slate-800 dark:hover:border-slate-700 rounded-md transition-colors" onClick={logout}>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="text-slate-400" size={18} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate group-hover:text-blue-400 text-slate-200 transition-colors">{user.displayName || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate cursor-pointer hover:text-slate-400">{t('sign_out')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
        <Outlet />
      </main>
    </div>
  );
}
