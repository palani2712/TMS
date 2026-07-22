import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API, { getErrorMessage } from '../services/api';
import { Save, Palette, Check, User, Mail, Phone, Settings as SettingsIcon, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

// Predefined themes
const PREDEFINED_THEMES = {
  dark: {
    name: 'Dark Theme',
    class: 'bg-black border-slate-700',
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
    name: 'Light Theme',
    class: 'bg-sky-200 border-sky-300',
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

// Apply theme helper
export const applyThemeColors = (colors, themeVars = null, bgImageUrl = null) => {
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

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    contactNumber: ''
  });
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [customColors, setCustomColors] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Password change state (for Managers)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSavePassword = async (e) => {
    e.preventDefault();

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

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await API.put('/users/change-password', { password: newPassword });
      showToast('Password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update password.'), 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    // Load profile
    const loadProfile = async () => {
      try {
        const res = await API.get('/users/me');
        const data = res.data;
        setProfileForm({
          fullName: data.fullName || '',
          email: data.email || '',
          contactNumber: data.contactNumber || ''
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to load profile details.', 'error');
      }
    };
    loadProfile();

    if (!user) return;
    const username = user.username;
    // Load active theme choice
    const savedTheme = localStorage.getItem(`theme-choice-${username}`) || 'light';
    setSelectedTheme(savedTheme);
    if (savedTheme === 'custom') {
      const savedCustom = localStorage.getItem(`custom-colors-${username}`);
      const savedVars = localStorage.getItem(`custom-vars-${username}`);
      const savedBgImg = localStorage.getItem(`custom-bg-image-${username}`);
      if (savedCustom) {
        const parsedColors = JSON.parse(savedCustom);
        const parsedVars = savedVars ? JSON.parse(savedVars) : null;
        setCustomColors(parsedColors);
        applyThemeColors(parsedColors, parsedVars, savedBgImg);
      }
    } else {
      if (PREDEFINED_THEMES[savedTheme]) {
        applyThemeColors(PREDEFINED_THEMES[savedTheme].colors, PREDEFINED_THEMES[savedTheme].themeVars, null);
      }
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Validate and format mobile number if entered
    let formattedPhone = profileForm.contactNumber.trim();
    if (formattedPhone) {
      // Strip spaces, hyphens, and normalize prefixes
      let basePhone = formattedPhone.replace(/[\s-]/g, '');
      if (basePhone.startsWith('+91')) {
        basePhone = basePhone.substring(3);
      } else if (basePhone.startsWith('91') && basePhone.length === 12) {
        basePhone = basePhone.substring(2);
      } else if (basePhone.startsWith('0') && basePhone.length === 11) {
        basePhone = basePhone.substring(1);
      }

      // Check if it is exactly 10 digits (and starts with valid digits 6-9)
      const tenDigitRegex = /^[6-9]\d{9}$/;
      if (!tenDigitRegex.test(basePhone)) {
        showToast('Please enter a valid 10-digit mobile number.', 'error');
        setIsSaving(false);
        return;
      }
      formattedPhone = `+91 ${basePhone}`;
    }

    // Validate email ends with .com if entered
    const emailVal = profileForm.email.trim();
    if (emailVal) {
      if (!emailVal.toLowerCase().endsWith('.com')) {
        showToast('Email ID must end with .com', 'error');
        setIsSaving(false);
        return;
      }
    }

    try {
      const payload = {
        ...profileForm,
        contactNumber: formattedPhone
      };
      const res = await API.put('/users/profile', payload);
      setProfileForm(prev => ({ ...prev, contactNumber: formattedPhone }));
      
      // Sync user profile in Auth context
      updateProfile({
        ...user,
        fullName: res.data.fullName,
        email: res.data.email,
        contactNumber: res.data.contactNumber
      });
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update profile.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const selectPredefinedTheme = (key) => {
    if (!user) return;
    const username = user.username;
    setSelectedTheme(key);
    applyThemeColors(PREDEFINED_THEMES[key].colors, PREDEFINED_THEMES[key].themeVars, null);
    localStorage.setItem(`theme-choice-${username}`, key);
    localStorage.removeItem(`custom-colors-${username}`);
    localStorage.removeItem(`custom-vars-${username}`);
    localStorage.removeItem(`custom-bg-image-${username}`);
    
    if (key === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem(`theme-${username}`, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(`theme-${username}`, 'light');
    }
    
    showToast(`${PREDEFINED_THEMES[key].name} applied.`, 'success');
  };

  // Convert RGB to HSL helper
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  // Convert HSL to Hex helper
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Generate complete set of shades (50-900) based on base H, S, L
  const generateShades = (h, s, baseL) => {
    // Generate scale of lightnesses
    const lightnessScale = {
      50: 96,
      100: 90,
      200: 80,
      300: 70,
      400: 60,
      500: Math.max(25, Math.min(75, baseL)), // clamp base L to avoid too bright/dark base
      600: 42,
      700: 32,
      800: 22,
      900: 12
    };

    const shades = {};
    Object.entries(lightnessScale).forEach(([shade, l]) => {
      shades[shade] = hslToHex(h, s, l);
    });
    return shades;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw to hidden canvas to extract dominant color
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imgData = ctx.getImageData(0, 0, 50, 50).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        // Extract dominant/vibrant pixels
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;

          // Exclude extreme whites, dark grays and washed out colors
          if (diff > 30 && max > 40 && max < 245) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        // Fallback to general average if no vibrant pixels found
        if (count === 0) {
          for (let i = 0; i < imgData.length; i += 4) {
            rSum += imgData[i];
            gSum += imgData[i + 1];
            bSum += imgData[i + 2];
            count++;
          }
        }

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);

        // Convert dominant color to HSL and generate shades
        const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
        const generated = generateShades(h, s, l);

        const isDarkTheme = l < 50;

        const customThemeVars = {
          '--color-bg-app': isDarkTheme ? '#121212' : '#f8fafc',
          '--color-bg-card': isDarkTheme ? 'rgba(24, 24, 27, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          '--color-text-main': isDarkTheme ? '#f8fafc' : '#0f172a',
          '--color-border-main': isDarkTheme ? 'rgba(255, 255, 255, 0.15)' : 'rgba(226, 232, 240, 0.8)',
          '--color-chart-completed': generated[600],
          '--color-chart-pending': generated[400],
          '--color-chart-overdue': generated[200]
        };

        if (isDarkTheme) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }

        // Compress and save background image
        const imgCanvas = document.createElement('canvas');
        const imgCtx = imgCanvas.getContext('2d');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        imgCanvas.width = width;
        imgCanvas.height = height;
        imgCtx.drawImage(img, 0, 0, width, height);

        try {
          const username = user?.username;
          const compressedDataUrl = imgCanvas.toDataURL('image/jpeg', 0.7);
          localStorage.setItem(`custom-bg-image-${username}`, compressedDataUrl);
          
          setCustomColors(generated);
          setSelectedTheme('custom');
          applyThemeColors(generated, customThemeVars, compressedDataUrl);

          localStorage.setItem(`theme-choice-${username}`, 'custom');
          localStorage.setItem(`custom-colors-${username}`, JSON.stringify(generated));
          localStorage.setItem(`custom-vars-${username}`, JSON.stringify(customThemeVars));
          showToast('Custom theme and background image applied successfully!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to save background image.', 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex gap-3 items-start">
        <SettingsIcon className="w-8 h-8 text-primary-500 animate-spin-slow mt-1 shrink-0" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your profile information, change your password, and customize your workspace with dynamic themes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (Profile & Password Change) */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-6 rounded-3xl space-y-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-5 h-5 text-primary-500" />
              <span>Profile Details</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">Username</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-655 dark:text-slate-100 text-sm w-full">
                  <span className="font-semibold select-none text-slate-400 dark:text-slate-500">@</span>
                  <span>{user?.username}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
                    value={profileForm.fullName}
                    onChange={handleProfileChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">Email ID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">Contact Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    name="contactNumber"
                    placeholder="+91 98765 43210"
                    value={profileForm.contactNumber}
                    onChange={handleProfileChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {user && (
            <div className="glass p-6 rounded-3xl space-y-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <KeyRound className="w-5 h-5 text-primary-500" />
                <span>Change Password</span>
              </h3>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, letters, numbers & special chars"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider block mb-1">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Retype your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Theme Settings Column */}
        <div className="glass p-6 rounded-3xl space-y-6 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Palette className="w-5 h-5 text-primary-500" />
            <span>Theme settings</span>
          </h3>

          {/* Predefined selection */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Predefined Themes</span>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PREDEFINED_THEMES).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => selectPredefinedTheme(key)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all relative overflow-hidden group cursor-pointer ${
                    selectedTheme === key
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg ${item.class} shadow-sm border border-white/20`} />
                  <span className="text-xs font-semibold">{item.name}</span>
                  {selectedTheme === key && (
                    <div className="absolute right-2 top-2 w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
