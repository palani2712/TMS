import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserMinus, 
  ShieldAlert, 
  X,
  UserCheck2,
  Key,
  Info,
  ChevronDown
} from 'lucide-react';

const Users = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: null,
    username: '',
    password: '',
    role: 'ROLE_EMPLOYEE',
    email: '',
    managerUsername: '',
  });

  // Change Password Modal State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    userId: null,
    username: '',
    newPassword: '',
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load user directories.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setExpandedUserId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setUserForm({
      id: null,
      username: '',
      password: '',
      role: 'ROLE_EMPLOYEE',
      email: '',
      managerUsername: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (targetUser) => {
    setUserForm({
      id: targetUser.id,
      username: targetUser.username,
      password: '', // Leave blank unless updating password
      role: targetUser.role,
      email: targetUser.email || '',
      managerUsername: targetUser.managerUsername || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.username.trim()) {
      showToast('Username is required.', 'error');
      return;
    }
    if (!userForm.email || !userForm.email.trim()) {
      showToast('Email ID is required.', 'error');
      return;
    }
    if (!userForm.email.trim().toLowerCase().endsWith('.com')) {
      showToast('Email ID must end with .com', 'error');
      return;
    }

    try {
      const payload = {
        username: userForm.username,
        role: userForm.role,
        email: userForm.email.trim(),
      };
      if (userForm.password.trim()) {
        if (userForm.password.length < 8) {
          showToast('Password must be at least 8 characters.', 'error');
          return;
        }
        const hasLetter = /[a-zA-Z]/.test(userForm.password);
        const hasNumber = /\d/.test(userForm.password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':",./<>?\\|`~]/.test(userForm.password);
        if (!hasLetter || !hasNumber || !hasSpecial) {
          showToast('Password must contain letters, numbers, and special characters.', 'error');
          return;
        }
        payload.password = userForm.password;
      }
      if (userForm.role === 'ROLE_EMPLOYEE' && userForm.managerUsername) {
        payload.managerUsername = userForm.managerUsername;
      }

      if (userForm.id) {
        // Edit User
        if (user.role === 'ROLE_ADMIN') {
          await API.put(`/users/admin/update/${userForm.id}`, payload);
        } else {
          await API.put(`/users/manager/update-employee/${userForm.id}`, payload);
        }
        showToast('User account updated successfully.', 'success');
      } else {
        // Create User
        if (!userForm.password.trim()) {
          showToast('Password is required for new accounts.', 'error');
          return;
        }
        payload.password = userForm.password;

        if (user.role === 'ROLE_ADMIN') {
          await API.post('/users/admin/create', payload);
        } else {
          await API.post('/users/manager/create-employee', payload);
        }
        showToast('User account created successfully.', 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data || 'Failed to save user.', 'error');
    }
  };

  const handleDeleteUser = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/users/admin/delete/${targetUserId}`);
      showToast('User account deleted.', 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data || 'Failed to delete user.', 'error');
    }
  };

  const handleToggleResetPermission = async (targetUser) => {
    const newAllowed = !targetUser.passwordResetAllowed;
    try {
      if (user.role === 'ROLE_ADMIN') {
        await API.put(`/users/admin/toggle-reset-permission/${targetUser.id}?allowed=${newAllowed}`);
      } else {
        await API.put(`/users/manager/toggle-reset-permission/${targetUser.id}?allowed=${newAllowed}`);
      }
      showToast(`Password reset privilege ${newAllowed ? 'granted' : 'revoked'} for ${targetUser.username}.`, 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to modify permissions.', 'error');
    }
  };

  const openChangePasswordModal = (targetUser) => {
    setPasswordForm({
      userId: targetUser.id,
      username: targetUser.username,
      newPassword: '',
    });
    setIsChangePasswordModalOpen(true);
  };

  const handleUpdateUserPassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword.trim()) {
      showToast('Password is required.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(passwordForm.newPassword);
    const hasNumber = /\d/.test(passwordForm.newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':",./<>?\\|`~]/.test(passwordForm.newPassword);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      showToast('Password must contain letters, numbers, and special characters.', 'error');
      return;
    }

    try {
      await API.put(`/users/admin/update/${passwordForm.userId}`, {
        username: passwordForm.username,
        password: passwordForm.newPassword,
      });
      showToast(`Password updated successfully for ${passwordForm.username}.`, 'success');
      setIsChangePasswordModalOpen(false);
    } catch (err) {
      showToast(err.response?.data || 'Failed to update password.', 'error');
    }
  };

  // Filtered Users list
  const filteredUsers = useMemo(() => {
    const roleOrder = {
      'ROLE_ADMIN': 1,
      'ROLE_MANAGER': 2,
      'ROLE_EMPLOYEE': 3
    };

    return users
      .filter(u => {
        // Rule: Managers can only view Employees assigned under them. Admin (GM) can view everyone.
        if (user.role === 'ROLE_MANAGER') {
          const isSelf = u.username === user.username;
          const isManagerGM = u.role === 'ROLE_ADMIN';
          const isMyEmployee = u.role === 'ROLE_EMPLOYEE' && u.managerUsername === user.username;
          if (!isSelf && !isManagerGM && !isMyEmployee) {
            return false;
          }
        }

        const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.username.localeCompare(b.username);
      });
  }, [users, searchQuery, roleFilter, user.role, user.username]);

  const roleLabels = {
    'ROLE_ADMIN': 'General Manager',
    'ROLE_MANAGER': 'Manager',
    'ROLE_EMPLOYEE': 'Employee',
  };

  const roleBadgeColor = {
    'ROLE_ADMIN': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
    'ROLE_MANAGER': 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    'ROLE_EMPLOYEE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-primary-500" />
            <span>User Directory</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create and Manager all te Users
          </p>
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-button-secondary-bg)] hover:opacity-90 text-[var(--color-button-secondary-text)] border border-[var(--color-button-secondary-border)] dark:bg-primary-600 dark:hover:bg-primary-700 dark:text-white dark:border-transparent dark:hover:opacity-100 rounded-xl font-medium text-sm shadow-md transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{user.role === 'ROLE_ADMIN' ? 'Create User' : 'Add Employee'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>

        {/* Role Select (Only for Admin) */}
        {user.role === 'ROLE_ADMIN' && (
          <div className="flex items-center gap-1.5 text-xs w-full md:w-auto justify-end">
            <span className="text-slate-500">Filter Role:</span>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 focus:outline-none"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ALL">All Roles</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_ADMIN">General Managers</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_MANAGER">Managers</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_EMPLOYEE">Employees</option>
            </select>
          </div>
        )}
      </div>

      {/* Users Grid Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading directories...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg">No accounts found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">Try modifying your search or register a new user in the directory.</p>
        </div>
      ) : (
        <div className="glass rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-center">Username</th>
                  <th className="p-4 text-center">Role Badge</th>
                  {user.role === 'ROLE_ADMIN' && <th className="p-4 text-center">Password reset</th>}
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredUsers.map((item, index) => {
                  const isOdd = index % 2 !== 0;
                  const rowBg = expandedUserId === item.id 
                    ? 'bg-slate-100/60 dark:bg-slate-900/40 font-medium' 
                    : (isOdd ? 'bg-slate-100/30 dark:bg-slate-900/10' : 'bg-transparent');
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-100/40 dark:hover:bg-slate-900/20 transition-colors ${rowBg}`}>
                      {/* User profile info (Clickable to expand) */}
                      <td 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedUserId(expandedUserId === item.id ? null : item.id);
                        }}
                        className="p-4 font-bold flex items-center gap-2 justify-center cursor-pointer text-slate-850 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 select-none transition-colors"
                        title="Click to view details"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300 font-bold text-sm flex items-center justify-center select-none uppercase">
                          {item.username.substring(0, 2)}
                        </div>
                        <span>{item.username}</span>
                      </td>
                      
                      {/* Role badge */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border border-transparent ${roleBadgeColor[item.role]}`}>
                          {roleLabels[item.role]}
                        </span>
                      </td>


                      {/* GM-only Password Change Column */}
                      {user.role === 'ROLE_ADMIN' && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openChangePasswordModal(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-primary-600 dark:text-primary-400 transition-all shadow-sm mx-auto"
                            title="Change User Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Change PW</span>
                          </button>
                        </td>
                      )}

                      {/* Action buttons */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Edit Credentials"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          {/* Only Admins can delete users, and cannot delete themselves */}
                          {user.role === 'ROLE_ADMIN' && user.id !== item.id && (
                            <button
                              onClick={() => handleDeleteUser(item.id)}
                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Personal Details Dropdown Trigger */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedUserId(expandedUserId === item.id ? null : item.id);
                            }}
                            className={`p-2 rounded-lg transition-all flex items-center gap-0.5 ${
                              expandedUserId === item.id 
                                ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600' 
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700'
                            }`}
                            title="View Contact Details"
                          >
                            <Info className="w-4 h-4" />
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedUserId === item.id ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Details Sub-row */}
                    {expandedUserId === item.id && (
                      <tr className="bg-slate-100/60 dark:bg-slate-900/40">
                        <td colSpan={user.role === 'ROLE_ADMIN' ? 4 : 3} className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 rounded-2xl bg-white/50 dark:bg-black border border-slate-200/60 dark:border-slate-800/40 shadow-inner animate-fadeIn text-left sm:pl-24">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Full Name</span>
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.fullName || 'Not Provided'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Mobile Number</span>
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                {item.contactNumber ? (item.contactNumber.startsWith('+91') ? item.contactNumber : `+91 ${item.contactNumber}`) : 'Not Provided'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Email Address</span>
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 break-all">{item.email || 'Not Provided'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-md shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-850 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold">{userForm.id ? 'Edit User Credentials' : 'Create User Account'}</h2>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                <input
                  type="text"
                  name="username"
                  value={userForm.username}
                  onChange={handleInputChange}
                  placeholder="Enter unique username"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                  disabled={userForm.id !== null && user.role !== 'ROLE_ADMIN'} // Managers can't edit existing username if restrictions apply, but let's follow the standard rule (employees cannot edit own username). GMs can edit.
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email ID</label>
                <input
                  type="email"
                  name="email"
                  value={userForm.email || ''}
                  onChange={handleInputChange}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                />
              </div>

              {(!userForm.id || user.role === 'ROLE_ADMIN') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Password {userForm.id && '(Leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    required={!userForm.id}
                  />
                </div>
              )}

              {/* Role select (Only Admin can create Managers or Admins. Managers can only create Employees, so it is fixed) */}
              {user.role === 'ROLE_ADMIN' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">User Role</label>
                  <select
                    name="role"
                    value={userForm.role}
                    onChange={handleInputChange}
                    disabled={userForm.id !== null}
                    className={`w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${userForm.id !== null ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-semibold text-sm' : 'bg-white dark:bg-slate-900'}`}
                  >
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_EMPLOYEE">Employee</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_MANAGER">Manager</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ROLE_ADMIN">General Manager</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">User Role</label>
                  <input
                    type="text"
                    value={
                      userForm.role === 'ROLE_ADMIN'
                        ? 'General Manager'
                        : userForm.role === 'ROLE_MANAGER'
                          ? 'Manager'
                          : 'Employee'
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold cursor-not-allowed text-sm"
                    disabled
                  />
                </div>
              )}

              {user.role === 'ROLE_ADMIN' && userForm.role === 'ROLE_EMPLOYEE' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assign under Manager</label>
                  <select
                    name="managerUsername"
                    value={userForm.managerUsername}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    required
                  >
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="">Select a Manager</option>
                    {users.filter(u => u.role === 'ROLE_MANAGER').map(m => (
                      <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" key={m.id} value={m.username}>{m.username}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm shadow-md transition-colors"
                >
                  {userForm.id ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD DIALOG */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsChangePasswordModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-md shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-850 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold">Change Password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Update password for user: <span className="font-semibold text-slate-700 dark:text-slate-300">{passwordForm.username}</span></p>
            </div>

            <form onSubmit={handleUpdateUserPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="•••••••• (Min 8 characters, complex)"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm shadow-md transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
