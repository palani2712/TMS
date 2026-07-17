import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckSquare, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import API from '../services/api';

const Login = () => {
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password States
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!forgotUsername.trim() || !forgotEmail.trim()) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    setIsForgotSubmitting(true);
    try {
      const res = await API.post('/auth/forgot-password/request', {
        username: forgotUsername.trim(),
        email: forgotEmail.trim(),
      });
      showToast(res.data || 'OTP sent successfully!', 'success');
      setForgotStep(2);
    } catch (err) {
      showToast(err.response?.data || 'Failed to request password reset OTP.', 'error');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmNewPassword) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':",./<>?\\|`~]/.test(newPassword);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      showToast('Password must contain letters, numbers, and special characters.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const res = await API.post('/auth/forgot-password/verify', {
        username: forgotUsername.trim(),
        otp: otpCode,
        newPassword: newPassword,
      });
      showToast(res.data || 'Password reset successfully!', 'success');
      setIsForgotOpen(false);
      setForgotStep(1);
      setForgotUsername('');
      setForgotEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      showToast(err.response?.data || 'Failed to reset password.', 'error');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

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
        <div className="bg-[#363636] backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 text-white flex flex-col items-center">
          
          <img src="/logo-cs.png" alt="Career School HR Solutions" className="h-56 w-auto object-contain mb-1 mt-6" />
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-white">Welcome Back</h1>
          <p className="text-slate-400 text-sm mb-8 text-center font-medium">
            Sign in to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all flex items-center justify-center gap-2 border-0"
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

          {/* Forgot Password Link */}
          <div className="text-center mt-5 w-full">
            <button
              type="button"
              onClick={() => { setIsForgotOpen(true); setForgotStep(1); }}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => { setIsForgotOpen(false); setForgotStep(1); }} />
          <div className="bg-[#363636] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden text-white p-6 space-y-6">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">Reset Password</h2>
              <button
                onClick={() => { setIsForgotOpen(false); setForgotStep(1); }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4 text-left w-full">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your Username and registered Email Address. We will send a 6-digit One-Time Password (OTP) to your email to verify your identity.
                </p>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm font-medium"
                    required
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {isForgotSubmitting ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4 text-left w-full">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong> and your new account password.
                </p>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm font-medium tracking-widest text-center text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Min 8 characters, letters & symbols"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm font-medium"
                    required
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {isForgotSubmitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
