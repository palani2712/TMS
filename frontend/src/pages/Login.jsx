import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckSquare, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Force dark theme on login page mount
  useEffect(() => {
    // Read the last logged-in user from sessionStorage to identify their stored theme choice if available
    const savedUserStr = sessionStorage.getItem('user');
    let username = '';
    if (savedUserStr) {
      try {
        username = JSON.parse(savedUserStr).username;
      } catch (e) {}
    }

    const originalTheme = username ? (localStorage.getItem(`theme-choice-${username}`) || 'light') : 'light';
    document.documentElement.classList.add('dark');
    
    // Force dark theme variables on login page mount to prevent it from turning white
    const darkVars = {
      '--color-bg-app': '#000000',
      '--color-bg-card': 'rgba(24, 24, 27, 0.85)',
      '--color-text-main': '#f8fafc',
      '--color-border-main': 'rgba(255, 255, 255, 0.15)',
    };
    Object.entries(darkVars).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });

    // Set dark theme specific primary colors temporarily for login page aesthetics
    const darkColors = {
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
      500: '#a78bfa', 600: '#8b5cf6', 700: '#7c3aed', 800: '#6d28d9', 900: '#4c1d95'
    };
    Object.entries(darkColors).forEach(([shade, value]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, value);
    });

    return () => {
      // If a user has successfully logged in, let ThemeLoader handle their theme and do not clean up/reset here
      if (sessionStorage.getItem('user')) {
        return;
      }

      // Otherwise, restore original theme variables when leaving login page
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
            '--color-chart-overdue': '#ef4444'
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
            '--color-chart-overdue': '#ef4444'
          }
        }
      };
      
      const themeConfig = predefinedThemes['light'];
      if (themeConfig) {
        Object.entries(themeConfig.colors).forEach(([shade, value]) => {
          document.documentElement.style.setProperty(`--color-primary-${shade}`, value);
        });
        Object.entries(themeConfig.themeVars).forEach(([varName, value]) => {
          document.documentElement.style.setProperty(varName, value);
        });
        document.body.style.backgroundImage = 'none';
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Display notice if redirected from session expiration
  useEffect(() => {
    if (searchParams.get('session_expired')) {
      showToast('Your session has expired. Please log in again.', 'info');
    }
  }, [searchParams, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Please fill out all fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('Signed in successfully!', 'success');
      navigate('/');
    } else {
      showToast(result.message || 'Login failed', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#DAD8C9]">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md mx-4 z-10">
        <div className="bg-[#A3AABE] backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-slate-900 flex flex-col items-center">
          
          <span className="text-xs font-bold uppercase tracking-widest text-primary-800 mb-1 mt-4">Career School HR Solutions</span>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900">Welcome Back</h1>
          <p className="text-slate-700 text-sm mb-8 text-center font-medium">
            Sign in to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-slate-800 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-400/50 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-800 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/60 border border-slate-400/50 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all flex items-center justify-center gap-2 border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
