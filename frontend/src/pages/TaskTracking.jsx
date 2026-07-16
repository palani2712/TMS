import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import { 
  Users, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  ClipboardList
} from 'lucide-react';

const TaskTracking = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const usersRes = await API.get('/users');
        const tasksRes = await API.get('/tasks');
        setUsersList(usersRes.data);
        setTasks(tasksRes.data);
      } catch (err) {
        console.error(err);
        showToast('Failed to load tracking data.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleUserExpand = (username) => {
    setExpandedUsers(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/30';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/30';
      case 'LOW': return 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-350 border-slate-200 dark:border-slate-700/30';
      default: return '';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30';
      case 'IN_PROGRESS': return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-900/30';
      case 'PENDING': return 'bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700/30';
      case 'OVERDUE': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/30';
      case 'ON_HOLD': return 'bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/30';
      default: return '';
    }
  };

  // Group and filter users with their tasks based on role and search query
  const trackedData = useMemo(() => {
    const roleOrder = {
      'ROLE_ADMIN': 1,
      'ROLE_MANAGER': 2,
      'ROLE_EMPLOYEE': 3
    };

    // 1. Filter users based on logged-in user role
    // Admin: show Managers and Employees.
    // Manager: show Employees only.
    const eligibleUsers = usersList.filter(u => {
      const isSelf = u.username === user.username;
      if (user.role === 'ROLE_ADMIN') {
        // Admin sees managers and employees (and optionally self if they have tasks)
        return u.role === 'ROLE_MANAGER' || u.role === 'ROLE_EMPLOYEE' || isSelf;
      } else if (user.role === 'ROLE_MANAGER') {
        // Manager sees employees assigned under them, and themselves
        return (u.role === 'ROLE_EMPLOYEE' && u.managerUsername === user.username) || isSelf;
      }
      return false;
    });

    // 2. Map users to their tasks and calculate stats
    return eligibleUsers
      .map(u => {
        const userTasks = tasks
          .filter(t => t.assignedTo === u.username)
          .sort((a, b) => b.id - a.id);
        const completedCount = userTasks.filter(t => t.status === 'COMPLETED').length;
        const overdueCount = userTasks.filter(t => {
          if (t.status === 'ON_HOLD') return false;
          if (t.status === 'OVERDUE') return true;
          if (t.status === 'COMPLETED' || !t.dueDate) return false;
          return new Date(t.dueDate) < new Date();
        }).length;
        const pendingCount = userTasks.filter(t => {
          if (t.status !== 'PENDING' && t.status !== 'IN_PROGRESS') return false;
          const isTaskOverdue = t.status === 'OVERDUE' || (t.dueDate && new Date(t.dueDate) < new Date());
          return !isTaskOverdue;
        }).length;
        const onHoldCount = userTasks.filter(t => t.status === 'ON_HOLD').length;

        return {
          ...u,
          tasks: userTasks,
          stats: {
            total: userTasks.length,
            completed: completedCount,
            pending: pendingCount,
            overdue: overdueCount,
            onHold: onHoldCount
          }
        };
      })
      // 3. Apply search query filtering by username
      .filter(item => item.username.toLowerCase().includes(searchQuery.toLowerCase()))
      // 4. Sort by role hierarchy and then alphabetically by username
      .sort((a, b) => {
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.username.localeCompare(b.username);
      });
  }, [usersList, tasks, user, searchQuery]);

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
      <div className="pl-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-primary-500" />
          <span>Task Tracking</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track the Assigned Tasks
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search user by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-850 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Grid of Users */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading task overview...</span>
        </div>
      ) : trackedData.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg">No users found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">Try adapting your search name.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {trackedData.map((item) => {
            const isExpanded = !!expandedUsers[item.username];
            return (
              <div 
                key={item.id}
                className="glass rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800/80 shadow-sm"
              >
                {/* User Card Header */}
                <div 
                  onClick={() => toggleUserExpand(item.username)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300 font-bold flex items-center justify-center select-none uppercase">
                      {item.username.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {item.username}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border border-transparent uppercase ${roleBadgeColor[item.role]}`}>
                          {roleLabels[item.role]}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">Total assigned: {item.stats.total} tasks</p>
                    </div>
                  </div>

                  {/* Summary Badges & Toggle */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" /> {item.stats.completed} Completed
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="w-4 h-4" /> {item.stats.pending} Pending
                      </span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <AlertCircle className="w-4 h-4" /> {item.stats.overdue} Overdue
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Clock className="w-4 h-4" /> {item.stats.onHold} On-Hold
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Tasks List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/10 p-5">
                    {item.tasks.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-2">No tasks assigned to this user.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                              <th className="pb-3">Task Title</th>
                              <th className="pb-3 text-center">Priority</th>
                              <th className="pb-3 text-center">Status</th>
                              <th className="pb-3 text-center">Assigned By</th>
                              <th className="pb-3 text-center">Due Date</th>
                              <th className="pb-3 text-center">Due Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                            {item.tasks.map(task => (
                              <tr key={task.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/5 transition-colors">
                                <td className="py-3 font-semibold text-slate-700 dark:text-slate-300 max-w-[250px] truncate" title={task.title}>
                                  {task.title}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getPriorityStyle(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  {(() => {
                                    const isTaskOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date());
                                    const displayStatus = isTaskOverdue ? 'OVERDUE' : task.status;
                                    return (
                                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getStatusStyle(displayStatus)}`}>
                                        {displayStatus.replace('_', ' ')}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 text-center text-slate-500 dark:text-slate-400">
                                  {task.assignedBy}
                                </td>
                                <td className="py-3 text-center text-slate-500 dark:text-slate-400">
                                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                                </td>
                                <td className="py-3 text-center text-slate-500 dark:text-slate-400">
                                  {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No deadline'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskTracking;
