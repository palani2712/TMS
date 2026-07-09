import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import TaskTracking from './pages/TaskTracking';
import ChangePassword from './pages/ChangePassword';
import Settings from './pages/Settings';

const applyThemeColors = (colors, themeVars = null, bgImageUrl = null) => {
  if (!colors) return;
  Object.entries(colors).forEach(([shade, value]) => {
    document.documentElement.style.setProperty(`--color-primary-${shade}`, value);
  });
  if (themeVars) {
    Object.entries(themeVars).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });
  }
  if (bgImageUrl) {
    document.body.style.backgroundImage = `url(${bgImageUrl})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = 'none';
  }
};

// Loading Shell
const LoadingScreen = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
    <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-3" />
    <span className="text-sm font-semibold">Loading CSHR...</span>
  </div>
);

// Protected route middleware for authenticated users
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Route middleware for Admin & Managers only
const ManagementRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_MANAGER') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Inactivity handler that automatically logs out user after 5 minutes of inactivity
const InactivityHandler = () => {
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      logout();
      showToast('You have been signed out due to 5 minutes of inactivity.', 'info');
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    if (!user) return;

    // Start timer on mount
    resetTimer();

    // Interaction events to monitor
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    events.forEach(evt => {
      window.addEventListener(evt, resetTimer);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(evt => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [user]);

  return null;
};

// General app shell layout
const AppLayout = () => {
  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-main)] transition-colors duration-300 font-sans">
      <InactivityHandler />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const ThemeLoader = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login') {
      return;
    }
    let themeChoice = 'light';
    let username = '';
    
    if (user) {
      username = user.username;
      themeChoice = localStorage.getItem(`theme-choice-${username}`) || 'light';
    } else {
      const savedUserStr = sessionStorage.getItem('user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          username = savedUser.username;
          themeChoice = localStorage.getItem(`theme-choice-${username}`) || 'light';
        } catch (e) {}
      }
    }

    if (themeChoice === 'custom') {
      const savedCustom = localStorage.getItem(`custom-colors-${username}`);
      const savedVars = localStorage.getItem(`custom-vars-${username}`);
      const savedBgImg = localStorage.getItem(`custom-bg-image-${username}`);
      if (savedCustom) {
        applyThemeColors(JSON.parse(savedCustom), savedVars ? JSON.parse(savedVars) : null, savedBgImg);
      }
      
      const savedThemeMode = localStorage.getItem(`theme-${username}`) || 'light';
      if (savedThemeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
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
      if (predefinedThemes[themeChoice]) {
        applyThemeColors(predefinedThemes[themeChoice].colors, predefinedThemes[themeChoice].themeVars, null);
        if (themeChoice === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [user, location]);

  return null;
};

function App() {
  useEffect(() => {
    if (window.location.pathname === '/login') {
      return;
    }
    // Keep baseline default loading
    const savedTheme = localStorage.getItem('theme-choice') || 'light';
    if (savedTheme === 'custom') {
      const savedCustom = localStorage.getItem('custom-colors');
      const savedVars = localStorage.getItem('custom-vars');
      const savedBgImg = localStorage.getItem('custom-bg-image');
      if (savedCustom) {
        applyThemeColors(JSON.parse(savedCustom), savedVars ? JSON.parse(savedVars) : null, savedBgImg);
      }
      
      const savedThemeMode = localStorage.getItem('theme') || 'light';
      if (savedThemeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
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
      if (predefinedThemes[savedTheme]) {
        applyThemeColors(predefinedThemes[savedTheme].colors, predefinedThemes[savedTheme].themeVars, null);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ThemeLoader />
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Private Layout-wrapped Routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Management-only Routes */}
              <Route path="/users" element={
                <ManagementRoute><Users /></ManagementRoute>
              } />
              <Route path="/task-tracking" element={
                <ManagementRoute><TaskTracking /></ManagementRoute>
              } />
            </Route>

            {/* Fallback to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
