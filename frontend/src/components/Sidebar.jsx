import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  CheckSquare, 
  Users, 
  History, 
  Key, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Bell,
  ClipboardList,
  Settings as SettingsIcon
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      if (!user) return;
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        await API.post(`/notifications/${notif.id}/read`);
        fetchNotifications();
      }
      setIsNotificationOpen(false);
      localStorage.setItem('open-task-id', notif.taskId);
      navigate('/');
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Failed to process notification click:", err);
    }
  };

  const handleClearNotification = async (e, notifId) => {
    e.stopPropagation(); // prevent triggering the navigate handler
    try {
      await API.delete(`/notifications/${notifId}`);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to clear notification:", err);
    }
  };

  // Initialize theme from theme-choice
  useEffect(() => {
    if (!user) return;
    const username = user.username;
    const savedTheme = localStorage.getItem(`theme-choice-${username}`) || 'light';
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user]);

  const applyPredefinedTheme = (choice) => {
    const predefinedThemes = {
      dark: {
        colors: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
          500: '#a78bfa', 600: '#8b5cf6', 700: '#7c3aed', 800: '#6d28d9', 900: '#4c1d95'
        },
        themeVars: {
          '--color-bg-app': '#000000',
          '--color-bg-card': 'rgba(24, 24, 27, 0.85)',
          '--color-text-main': '#f8fafc',
          '--color-border-main': 'rgba(255, 255, 255, 0.15)',
          '--color-chart-completed': '#10b981',
          '--color-chart-pending': '#3b82f6',
          '--color-chart-overdue': '#ef4444',
          '--color-chart-onhold': '#d97706',
          '--color-autofill-bg': '#090d16',
          '--color-autofill-text': '#ffffff'
        }
      },
      light: {
        colors: {
          50: '#f0f9ff', 100: '#92c4e9', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
          500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#0c4a6e', 900: '#082f49'
        },
        themeVars: {
          '--color-bg-app': '#b3e0ff',
          '--color-bg-card': 'rgba(255, 255, 255, 0.8)',
          '--color-text-main': '#0c4a6e',
          '--color-border-main': 'rgba(14, 165, 233, 0.4)',
          '--color-chart-completed': '#10b981',
          '--color-chart-pending': '#3b82f6',
          '--color-chart-overdue': '#ef4444',
          '--color-chart-onhold': '#d97706',
          '--color-autofill-bg': '#f8fafc',
          '--color-autofill-text': '#0f172a'
        }
      }
    };
    const config = predefinedThemes[choice];
    if (config) {
      Object.entries(config.colors).forEach(([shade, value]) => {
        document.documentElement.style.setProperty(`--color-primary-${shade}`, value);
      });
      Object.entries(config.themeVars).forEach(([varName, value]) => {
        document.documentElement.style.setProperty(varName, value);
      });
      document.body.style.backgroundImage = 'none';
    }
  };

  const toggleTheme = () => {
    if (!user) return;
    const username = user.username;
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(`theme-${username}`, 'light');
      localStorage.setItem(`theme-choice-${username}`, 'light');
      setDarkMode(false);
      applyPredefinedTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem(`theme-${username}`, 'dark');
      localStorage.setItem(`theme-choice-${username}`, 'dark');
      setDarkMode(true);
      applyPredefinedTheme('dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleNameMap = {
    'ROLE_ADMIN': 'General Manager',
    'ROLE_MANAGER': 'Manager',
    'ROLE_EMPLOYEE': 'Employee',
  };

  const roleBadgeColor = {
    'ROLE_ADMIN': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40',
    'ROLE_MANAGER': 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-900/40',
    'ROLE_EMPLOYEE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40',
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: CheckSquare },
    ...(user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER' ? [
      { name: 'Users Directory', path: '/users', icon: Users },
      { name: 'Task Tracking', path: '/task-tracking', icon: ClipboardList }
    ] : []),
    ...(user?.role === 'ROLE_EMPLOYEE' && user?.passwordResetAllowed ? [
      { name: 'Change Password', path: '/change-password', icon: Key }
    ] : []),
    { name: 'Settings', path: '/settings', icon: SettingsIcon }
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between w-full p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 z-30 sticky top-0">
        <div className="flex items-center h-8">
          <img src={darkMode ? '/logo-dark-cs.png' : '/logo-light-cs.png'} alt="CSHR Logo" className="h-8 w-auto object-contain" />
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar shell */}
      <aside className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 w-64 lg:static lg:flex flex-col glass dark:bg-slate-900/90 border-r h-full max-h-screen text-[var(--color-text-main)]`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center h-10 max-w-[130px]">
            <img src={darkMode ? '/logo-dark-cs.png' : '/logo-light-cs.png'} alt="CSHR Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
            </button>
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute left-0 mt-3 w-80 glass rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-slate-800 dark:text-slate-100">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--color-text-main)]">Notifications</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {notifications.filter(n => !n.read).length} Unread
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        No notifications
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-3.5 transition-colors flex items-start gap-2.5 text-left group ${
                            notif.read
                              ? 'opacity-60'
                              : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Unread dot */}
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-primary-500'}`} />

                          {/* Message body — clickable to navigate */}
                          <div
                            className="flex-1 space-y-0.5 cursor-pointer"
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <p className={`text-xs leading-normal ${notif.read ? 'font-medium text-slate-500 dark:text-slate-400' : 'font-semibold text-[var(--color-text-main)]'}`}>
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                              {new Date(notif.createdDate).toLocaleString()}
                            </span>
                          </div>

                          {/* Clear button */}
                          <button
                            onClick={(e) => handleClearNotification(e, notif.id)}
                            title="Clear notification"
                            className="opacity-0 group-hover:opacity-100 ml-1 mt-0.5 shrink-0 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-all duration-150"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md uppercase mb-3 select-none">
            {user?.username?.substring(0, 2)}
          </div>
          <h2 className="font-semibold text-lg max-w-full truncate">{user?.username}</h2>
          <span className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full border ${roleBadgeColor[user?.role] || ''}`}>
            {roleNameMap[user?.role] || 'User'}
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive 
                      ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-white hover:bg-[var(--color-sidebar-item-hover-bg)] hover:text-[var(--color-sidebar-item-hover-text)]'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-sm shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Sign Out</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Are you sure you want to sign out of your account?</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
