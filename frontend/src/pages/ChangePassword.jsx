import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import { Lock, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';

const ChangePassword = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has permission to change their password (everyone can now change password)
  const hasPermission = true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission) return;

    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':",./<>?\\|`~]/.test(password);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      showToast('Password must contain letters, numbers, and special characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await API.put('/users/change-password', { password });
      showToast('Password updated successfully!', 'success');
      setPassword('');
      confirmPassword('');
    } catch (err) {
      showToast(err.response?.data || 'Failed to update password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="p-6 max-w-lg mx-auto w-full h-[60vh] flex flex-col items-center justify-center">
        <div className="glass p-8 rounded-3xl text-center shadow-lg border border-rose-200/50 dark:border-rose-950/20 max-w-md">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Access Restricted</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
            {user?.role === 'ROLE_ADMIN'
              ? 'General Managers are not allowed to change their passwords.'
              : 'Managers and Employees are not allowed to modify their passwords unless permission has been explicitly granted by the General Manager.'}
          </p>
          {user?.role !== 'ROLE_ADMIN' && (
            <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-400">
              Please contact the General Manager to enable the "Password Reset Privilege" for your account.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto w-full h-[70vh] flex flex-col justify-center">
      <div className="glass p-8 rounded-3xl shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-500 rounded-2xl border border-primary-100 dark:border-primary-900/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Change Account Password</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Enter your new credential details below</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 mb-1.5">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, letters, numbers & special chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
