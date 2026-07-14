import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  ClipboardList,
  MessageSquare,
  ChevronRight,
  User,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileText,
  X,
  Pin,
  Bell
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdDate');
  const [displayMode, setDisplayMode] = useState('default'); // 'default' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Calendar View State
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State (Task Create/Edit)
  const [taskForm, setTaskForm] = useState({
    id: null,
    title: '',
    description: '',
    assignedTo: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  const [commentText, setCommentText] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED_TO_OTHERS' | 'SELF_ASSIGNED'

  // Day Tasks Modal State
  const [isDayTasksModalOpen, setIsDayTasksModalOpen] = useState(false);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  // Fetch all tasks and employees (if manager/admin)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const taskRes = await API.get('/tasks');
      setTasks(taskRes.data);

      if (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_MANAGER') {
        const empRes = await API.get('/users/employees');
        setEmployees(empRes.data);
      }
      await fetchNotifications();
    } catch (err) {
      console.error(err);
      showToast('Failed to load dashboard data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const taskId = localStorage.getItem('open-task-id');
    if (taskId) {
      localStorage.removeItem('open-task-id');
      openDetailsModal({ id: parseInt(taskId, 10) });
    }
  }, [location]);

  // Handle Input Changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setTaskForm(prev => ({ ...prev, [name]: value }));
  };

  // Helper to get end of today (23:59) in ISO local format
  const getEndOfToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  };

  // Open Create Modal
  const openCreateModal = () => {
    setTaskForm({
      id: null,
      title: '',
      description: '',
      assignedTo: user.role === 'ROLE_EMPLOYEE' ? user.username : (employees[0]?.username || ''),
      priority: 'MEDIUM',
      dueDate: getEndOfToday(),
    });
    setIsCreateModalOpen(true);
  };

  // Open Create Modal for specific Calendar Date
  const openCreateModalForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateTime = `${year}-${month}-${day}T23:59`;
    
    setTaskForm({
      id: null,
      title: '',
      description: '',
      assignedTo: user.role === 'ROLE_EMPLOYEE' ? user.username : (employees[0]?.username || ''),
      priority: 'MEDIUM',
      dueDate: localDateTime,
    });
    setIsCreateModalOpen(true);
  };

  // Handle Calendar Day Cell Click
  const handleCalendarDayClick = (date) => {
    const dayTasks = getTasksForDay(date);
    setSelectedDate(date);
    setSelectedDateTasks(dayTasks);
    setIsDayTasksModalOpen(true);
  };

  // Assign Task from Day Preview Modal
  const handleAssignTaskFromDayModal = () => {
    setIsDayTasksModalOpen(false);
    openCreateModalForDate(selectedDate);
  };

  // Open task details from Day Preview Modal
  const handleViewTaskDetailsFromDayModal = (task) => {
    setIsDayTasksModalOpen(false);
    openDetailsModal(task);
  };

  // Open Edit Modal
  const openEditModal = (task, e) => {
    e.stopPropagation();
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.substring(0, 16) : '',
      status: task.status,
    });
    setIsCreateModalOpen(true);
    setIsDetailsModalOpen(false);
  };

  // Open Details Modal
  const openDetailsModal = async (task) => {
    try {
      const res = await API.get(`/tasks/${task.id}`);
      setSelectedTask(res.data);
      setIsDetailsModalOpen(true);
    } catch (err) {
      showToast('Failed to fetch task details.', 'error');
    }
  };

  // Create or Update Task
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showToast('Title is required.', 'error');
      return;
    }

    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate ? taskForm.dueDate : null,
        status: taskForm.status || null,
      };

      if (taskForm.id) {
        // Update task
        await API.put(`/tasks/${taskForm.id}`, payload);
        showToast('Task updated successfully.', 'success');
      } else {
        // Create task
        await API.post('/tasks', payload);
        showToast('Task assigned successfully.', 'success');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data || 'Failed to save task.', 'error');
    }
  };

  // Update Task Status directly
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status?status=${newStatus}`);
      showToast(`Task status updated to ${newStatus.replace('_', ' ')}.`, 'success');
      
      // Update selected task in modal if open
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
      fetchData();
    } catch (err) {
      showToast('Failed to update task status.', 'error');
    }
  };

  const handleRequestHold = async (taskId) => {
    try {
      const res = await API.post(`/tasks/${taskId}/request-hold`);
      showToast('Hold request submitted to creator.', 'success');
      setSelectedTask(res.data);
      fetchData();
    } catch (err) {
      showToast(err.response?.data || 'Failed to submit hold request.', 'error');
    }
  };

  const handleRespondHold = async (taskId, approved) => {
    try {
      const res = await API.post(`/tasks/${taskId}/respond-hold?approved=${approved}`);
      showToast(approved ? 'Hold request approved.' : 'Hold request rejected.', 'success');
      setSelectedTask(res.data);
      fetchData();
    } catch (err) {
      showToast(err.response?.data || 'Failed to respond to hold request.', 'error');
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      await API.post(`/notifications/${notif.id}/read`);
      setIsNotificationOpen(false);
      fetchNotifications();
      openDetailsModal({ id: notif.taskId });
    } catch (err) {
      console.error("Failed to process notification click:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await API.post(`/tasks/${selectedTask.id}/comments`, { content: commentText });
      setSelectedTask(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.data]
      }));
      setCommentText('');
      showToast('Comment added.', 'success');
    } catch (err) {
      showToast('Failed to add comment.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await API.delete(`/tasks/${taskId}`);
      showToast('Task deleted successfully.', 'success');
      setIsDetailsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data || 'Failed to delete task.', 'error');
    }
  };

  // Toggle pin status of a task
  const handleTogglePin = async (taskId, currentPinnedStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await API.put(`/tasks/${taskId}/pin?pinned=${!currentPinnedStatus}`);
      showToast(currentPinnedStatus ? 'Task unpinned.' : 'Task pinned.', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update pin status.', 'error');
    }
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const baseTasks = tasks.filter(task => {
      if (assignmentFilter === 'ASSIGNED_TO_OTHERS') {
        return task.assignedBy === user.username && task.assignedTo !== user.username;
      } else if (assignmentFilter === 'SELF_ASSIGNED') {
        return task.assignedTo === user.username;
      }
      return true;
    });

    const total = baseTasks.length;
    const completed = baseTasks.filter(t => t.status === 'COMPLETED').length;
    
    // Check if task is overdue (status is OVERDUE, or not completed and due date is in the past)
    const overdue = baseTasks.filter(t => {
      if (t.status === 'ON_HOLD') return false;
      if (t.status === 'OVERDUE') return true;
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const pending = baseTasks.filter(t => {
      if (t.status !== 'PENDING') return false;
      if (t.dueDate && new Date(t.dueDate) < new Date()) return false;
      return true;
    }).length;

    const inProgress = baseTasks.filter(t => {
      if (t.status !== 'IN_PROGRESS') return false;
      if (t.dueDate && new Date(t.dueDate) < new Date()) return false;
      return true;
    }).length;

    const onHold = baseTasks.filter(t => t.status === 'ON_HOLD').length;

    return { total, completed, pending: pending + inProgress, overdue, onHold };
  }, [tasks, assignmentFilter, user.username]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());

        const isOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date());

        let matchesStatus = false;
        if (statusFilter === 'ALL') {
          matchesStatus = true;
        } else if (statusFilter === 'PENDING_ACTIVE') {
          matchesStatus = (task.status === 'PENDING' || task.status === 'IN_PROGRESS') && !isOverdue;
        } else if (statusFilter === 'OVERDUE') {
          matchesStatus = isOverdue;
        } else if (statusFilter === 'PENDING') {
          matchesStatus = task.status === 'PENDING' && !isOverdue;
        } else if (statusFilter === 'IN_PROGRESS') {
          matchesStatus = task.status === 'IN_PROGRESS' && !isOverdue;
        } else {
          matchesStatus = task.status === statusFilter;
        }

        const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;

        let matchesAssignment = true;
        if (assignmentFilter === 'ASSIGNED_TO_OTHERS') {
          matchesAssignment = task.assignedBy === user.username && task.assignedTo !== user.username;
        } else if (assignmentFilter === 'SELF_ASSIGNED') {
          matchesAssignment = task.assignedTo === user.username;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignment;
      })
      .sort((a, b) => {
        // Pinned tasks float to the top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        if (sortBy === 'dueDate') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const diff = new Date(a.dueDate) - new Date(b.dueDate);
          if (diff !== 0) return diff;
        } else if (sortBy === 'priority') {
          const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const diff = weights[b.priority] - weights[a.priority];
          if (diff !== 0) return diff;
        } else if (sortBy === 'createdDate') {
          return new Date(b.createdDate) - new Date(a.createdDate);
        }
        return b.id - a.id;
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy, assignmentFilter, user.username]);

  // Pagination Logic
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // Mock Report Exporting
  const exportReport = (format) => {
    // Generate clean CSV format
    let content = "Task ID,Title,Description,Assigned By,Assigned To,Priority,Status,Due Date\n";
    filteredTasks.forEach(t => {
      content += `"${t.id}","${t.title.replace(/"/g, '""')}","${(t.description || '').replace(/"/g, '""')}","${t.assignedBy}","${t.assignedTo}","${t.priority}","${t.status}","${t.dueDate || ''}"\n`;
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Todo_Report_${new Date().toISOString().slice(0,10)}.${format === 'excel' ? 'csv' : 'txt'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Task report exported as ${format === 'excel' ? 'Excel (CSV)' : 'Text'} file.`, 'success');
  };

  const handleStatClick = (filterType) => {
    setStatusFilter(filterType);
    setViewMode('list');
    setCurrentPage(1);
    setTimeout(() => {
      document.getElementById('tasks-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/30';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/30';
      case 'LOW': return 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700/30';
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    const days = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevTotalDays - i),
        isCurrentMonth: false,
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const getTasksForDay = (dayDate) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, dayDate);
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Workspace Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">Welcome, {user?.username}. Track and manage tasks here.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-[var(--color-sidebar-item-hover-text)]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-[var(--color-sidebar-item-hover-text)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Assignment Filters */}
          {user?.role === 'ROLE_EMPLOYEE' && (
            <button
              onClick={() => {
                setAssignmentFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                assignmentFilter === 'ALL'
                  ? 'bg-primary-600 border-primary-600 text-white shadow-md hover:bg-primary-700 hover:border-primary-700'
                  : 'bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90'
              }`}
            >
              All Tasks
            </button>
          )}
          {(user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER') && (
            <>
              <button
                onClick={() => {
                  setAssignmentFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  assignmentFilter === 'ALL'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md hover:bg-primary-700 hover:border-primary-700'
                    : 'bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => {
                  setAssignmentFilter('ASSIGNED_TO_OTHERS');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  assignmentFilter === 'ASSIGNED_TO_OTHERS'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md hover:bg-primary-700 hover:border-primary-700'
                    : 'bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90'
                }`}
              >
                Assigned Tasks
              </button>
              <button
                onClick={() => {
                  setAssignmentFilter('SELF_ASSIGNED');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  assignmentFilter === 'SELF_ASSIGNED'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md hover:bg-primary-700 hover:border-primary-700'
                    : 'bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90'
                }`}
              >
                My Tasks
              </button>
            </>
          )}

          {/* Export Actions */}
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-button-secondary-border)] hover:opacity-90 font-medium text-sm transition-all text-[var(--color-button-secondary-text)] bg-[var(--color-button-secondary-bg)]"
            >
              <FileText className="w-4 h-4" />
              <span>Export Report</span>
            </button>
            <div className={`absolute right-0 mt-1.5 w-40 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all z-20 overflow-hidden ${isExportOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <button 
                onClick={() => { exportReport('excel'); setIsExportOpen(false); }} 
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Excel (CSV)</span>
              </button>
              <button 
                onClick={() => { exportReport('pdf'); setIsExportOpen(false); }} 
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Text File</span>
              </button>
            </div>
          </div>

          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-button-secondary-border)] hover:opacity-90 font-medium text-sm transition-all text-[var(--color-button-secondary-text)] bg-[var(--color-button-secondary-bg)] shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{user?.role === 'ROLE_EMPLOYEE' ? 'Add Task' : 'Assign Task'}</span>
          </button>
        </div>
      </div>

      {/* Analytics Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Tasks */}
        <div 
          onClick={() => handleStatClick('ALL')}
          className="glass p-6 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-indigo-200 dark:hover:border-indigo-900/40"
        >
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Tasks</span>
            <span className="text-3xl font-black mt-1 block">{stats.total}</span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Completed */}
        <div 
          onClick={() => handleStatClick('COMPLETED')}
          className="glass p-6 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-emerald-200 dark:hover:border-emerald-900/40"
        >
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">Completed</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black mt-1 block">{stats.completed}</span>
              <span className="text-xs text-slate-400">({stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0}%)</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => handleStatClick('PENDING_ACTIVE')}
          className="glass p-6 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-amber-200 dark:hover:border-amber-900/40"
        >
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">Pending</span>
            <span className="text-3xl font-black mt-1 block">{stats.pending}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => handleStatClick('OVERDUE')}
          className="glass p-6 rounded-2xl flex items-center justify-between shadow-sm border border-rose-200/50 dark:border-rose-950/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-rose-300 dark:hover:border-rose-900/40"
        >
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block text-rose-600 dark:text-rose-400">Overdue</span>
            <span className="text-3xl font-black mt-1 block text-rose-600 dark:text-rose-400">{stats.overdue}</span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* On-Hold */}
        <div 
          onClick={() => handleStatClick('ON_HOLD')}
          className="glass p-6 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-amber-200 dark:hover:border-amber-900/40"
        >
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block text-amber-600 dark:text-amber-400">On-Hold</span>
            <span className="text-3xl font-black mt-1 block text-amber-600 dark:text-amber-400">{stats.onHold}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Progress Charts & Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSS Chart component */}
        <div className="glass p-6 rounded-2xl shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-1">Completion Analytics</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Visual breakdown of status rates across all assignments</p>
          </div>
          <div className="h-44 flex items-end justify-around gap-4 px-4 mt-6">
            {/* Completed Bar */}
            <div className="flex flex-col items-center w-full max-w-[80px] gap-2 group">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-xl h-28 relative flex items-end overflow-hidden">
                <div 
                  style={{ 
                    height: `${stats.total > 0 ? (stats.completed/stats.total)*100 : 0}%`,
                    backgroundColor: 'var(--color-chart-completed)'
                  }} 
                  className="w-full rounded-t-xl transition-all duration-1000 ease-out shadow-inner"
                />
              </div>
              <span className="text-xs font-semibold">Completed</span>
            </div>
            {/* In Progress / Pending Bar */}
            <div className="flex flex-col items-center w-full max-w-[80px] gap-2 group">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-xl h-28 relative flex items-end overflow-hidden">
                <div 
                  style={{ 
                    height: `${stats.total > 0 ? (stats.pending/stats.total)*100 : 0}%`,
                    backgroundColor: 'var(--color-chart-pending)'
                  }} 
                  className="w-full rounded-t-xl transition-all duration-1000 ease-out shadow-inner"
                />
              </div>
              <span className="text-xs font-semibold">Pending</span>
            </div>
            {/* Overdue Bar */}
            <div className="flex flex-col items-center w-full max-w-[80px] gap-2 group">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-xl h-28 relative flex items-end overflow-hidden">
                <div 
                  style={{ 
                    height: `${stats.total > 0 ? (stats.overdue/stats.total)*100 : 0}%`,
                    backgroundColor: 'var(--color-chart-overdue)'
                  }} 
                  className="w-full rounded-t-xl transition-all duration-1000 ease-out shadow-inner"
                />
              </div>
              <span className="text-xs font-semibold">Overdue</span>
            </div>
            {/* On-Hold Bar */}
            <div className="flex flex-col items-center w-full max-w-[80px] gap-2 group">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-xl h-28 relative flex items-end overflow-hidden">
                <div 
                  style={{ 
                    height: `${stats.total > 0 ? (stats.onHold/stats.total)*100 : 0}%`,
                    backgroundColor: 'var(--color-chart-onhold)'
                  }} 
                  className="w-full rounded-t-xl transition-all duration-1000 ease-out shadow-inner"
                />
              </div>
              <span className="text-xs font-semibold">On-Hold</span>
            </div>
          </div>
        </div>

        {/* Task Activity Summary info */}
        <div className="glass p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-1">Productivity Insights</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">A snapshot of today's workplace efficiency</p>
          </div>
          <div className="space-y-4 my-6 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Completion Rate</span>
              <span className="font-bold text-sm">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Overdue Warning</span>
              <span className={`font-bold text-sm ${stats.overdue > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                {stats.overdue > 0 ? `${stats.overdue} Tasks` : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Team Scope</span>
              <span className="font-bold text-sm">
                {employees.length} Active Users
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Task Listing */}
      <div id="tasks-section" className="space-y-6">
        {/* Filter Toolbar */}
        <div className="glass p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm">
          {/* Search */}
          <div className="relative w-full lg:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search title, details, assignee..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          {/* Selector filters */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
            {/* View Select */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold">View:</span>
                <select 
                  value={displayMode}
                  onChange={(e) => { setDisplayMode(e.target.value); setCurrentPage(1); }}
                  className="bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-semibold"
                >
                  <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="default">Default View</option>
                  <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="table">Table View</option>
                </select>
              </div>
            )}

            {/* Status Select */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-semibold"
              >
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ALL">All Statuses</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="PENDING">Pending</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="IN_PROGRESS">In Progress</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="COMPLETED">Completed</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="OVERDUE">Overdue Tasks</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ON_HOLD">On-Hold</option>
              </select>
            </div>

            {/* Priority Select */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Priority:</span>
              <select 
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                className="bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-semibold"
              >
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ALL">All Priorities</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="HIGH">High</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="MEDIUM">Medium</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="LOW">Low</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-semibold"
              >
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="dueDate">Due Date</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="priority">Priority weight</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="createdDate">Creation date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading / Empty / Task Cards list */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-slate-500 text-sm font-medium">Fetching assignments...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="glass p-12 rounded-3xl text-center shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg">No tasks found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">Try adjusting your filters or search terms, or assign a new task to your team.</p>
          </div>
        ) : (
          viewMode === 'list' ? (
            <div className="space-y-6">
              {displayMode === 'default' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedTasks.map((task) => {
                    const isTaskOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date());
                    const displayStatus = isTaskOverdue ? 'OVERDUE' : task.status;
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => openDetailsModal(task)}
                        className="glass p-6 rounded-3xl cursor-pointer hover:shadow-md border border-slate-100 hover:border-primary-100 dark:border-slate-800 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-5 relative group"
                      >
                        {/* Task Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getPriorityStyle(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusStyle(displayStatus)}`}>
                                {displayStatus.replace('_', ' ')}
                              </span>
                            </div>
                          <button
                            onClick={(e) => handleTogglePin(task.id, task.pinned, e)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              task.pinned 
                                ? 'bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400' 
                                : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-900/50'
                            }`}
                            title={task.pinned ? "Unpin task" : "Pin task"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${task.pinned ? 'fill-current rotate-45' : ''}`} />
                          </button>
                        </div>

                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                          {task.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">
                          {task.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Task Footer */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 max-w-[180px]" title={`${task.assignedBy} ➔ ${task.assignedTo}`}>
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{task.assignedBy}</span>
                            <span className="mx-1 text-[13px] font-black text-slate-400 dark:text-slate-500 shrink-0">➔</span>
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{task.assignedTo}</span>
                          </div>
                          {task.createdDate && (
                            <span className="text-[10px] text-slate-400">
                              Created: {new Date(task.createdDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                            </span>
                          )}
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center justify-end gap-1 text-slate-400 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : (
                <div className="glass rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-805/80 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
                          <th className="p-4">Task Title</th>
                          <th className="p-4 text-center">Priority</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Assigned By</th>
                          <th className="p-4 text-center">Assigned To</th>
                          <th className="p-4 text-center">Created Date</th>
                          <th className="p-4 text-center">Due Date</th>
                          <th className="p-4 text-center">Due Time</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {paginatedTasks.map(task => {
                          const isTaskOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date());
                          const displayStatus = isTaskOverdue ? 'OVERDUE' : task.status;
                          return (
                            <tr 
                              key={task.id} 
                              onClick={() => openDetailsModal(task)}
                              className="hover:bg-slate-100/30 dark:hover:bg-slate-900/5 transition-colors cursor-pointer"
                            >
                              <td className="p-4 font-semibold text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={task.title}>
                                <div className="flex items-center gap-2">
                                  {task.pinned && <Pin className="w-3 h-3 text-amber-500 fill-current rotate-45 shrink-0" />}
                                  <span>{task.title}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getPriorityStyle(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getStatusStyle(displayStatus)}`}>
                                  {displayStatus.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{task.assignedBy}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{task.assignedTo}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                {task.createdDate ? new Date(task.createdDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                              </td>
                              <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No deadline'}
                              </td>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => handleTogglePin(task.id, task.pinned, e)}
                                    className={`p-1 rounded-lg border transition-all ${
                                      task.pinned 
                                        ? 'bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400' 
                                        : 'border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-800'
                                    }`}
                                    title={task.pinned ? "Unpin task" : "Pin task"}
                                  >
                                    <Pin className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => openEditModal(task, e)}
                                    disabled={task.assignedBy !== user.username}
                                    className={`p-1 rounded-lg border border-slate-250 dark:border-slate-750 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 ${
                                      task.assignedBy !== user.username ? 'opacity-30 cursor-not-allowed' : ''
                                    }`}
                                    title="Edit Task"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    disabled={task.assignedBy !== user.username}
                                    className={`p-1 rounded-lg border border-slate-250 dark:border-slate-750 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 ${
                                      task.assignedBy !== user.username ? 'opacity-30 cursor-not-allowed' : ''
                                    }`}
                                    title="Delete Task"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-8">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm font-medium px-4 select-none">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Calendar View */
            <div className="glass p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 max-w-3xl mx-auto">
              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors font-medium ml-2 shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                    Today
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const prev = new Date(currentDate);
                      prev.setMonth(prev.getMonth() - 1);
                      setCurrentDate(prev);
                    }}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const next = new Date(currentDate);
                      next.setMonth(next.getMonth() + 1);
                      setCurrentDate(next);
                    }}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days of the Week Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {getDaysInMonth(currentDate).map((day, idx) => {
                  const isToday = isSameDay(day.date, new Date());
                  const dayTasks = getTasksForDay(day.date);
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => handleCalendarDayClick(day.date)}
                      className={`min-h-[80px] p-1.5 rounded-xl border transition-all flex flex-col items-center justify-between cursor-pointer group/cell ${
                        day.isCurrentMonth
                          ? dayTasks.length > 0
                            ? 'bg-primary-50/20 dark:bg-primary-950/10 border-primary-200/50 dark:border-primary-900/30 hover:bg-primary-50/30 dark:hover:bg-primary-900/20 shadow-sm'
                            : 'bg-white/40 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 hover:bg-white/60 dark:hover:bg-slate-900/60'
                          : 'bg-slate-50/20 dark:bg-slate-950/10 border-transparent text-slate-400 dark:text-slate-600'
                      } ${
                        isToday
                          ? 'ring-2 ring-primary-500 border-transparent bg-primary-50/10 dark:bg-primary-950/10'
                          : ''
                      }`}
                    >
                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday 
                          ? 'bg-primary-500 text-white' 
                          : dayTasks.length > 0
                            ? 'bg-primary-500/20 text-primary-750 dark:text-primary-300 font-extrabold ring-1 ring-primary-500/30'
                            : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {day.date.getDate()}
                      </span>
                      
                      {/* Task List in Calendar Cell */}
                      {dayTasks.length > 0 && (
                        <div className="w-full flex flex-col gap-1 mt-1 overflow-hidden">
                          {dayTasks.slice(0, 2).map(task => {
                            const isOverdue = task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date();
                            let bgClass = 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/30'; // Red if overdue
                            if (task.status === 'COMPLETED') {
                              bgClass = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'; // Green
                            } else if (!isOverdue) {
                              bgClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'; // Yellow if pending/in progress
                            }
                            return (
                              <div
                                key={task.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsModal(task);
                                }}
                                className={`text-[11px] leading-tight font-semibold px-2 py-1 rounded border truncate w-full text-center transition-all hover:scale-[1.02] ${bgClass}`}
                                title={`${task.title} (${task.status.replace('_', ' ')})`}
                              >
                                {task.title}
                              </div>
                            );
                          })}
                          {dayTasks.length > 2 && (
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold self-center">
                              +{dayTasks.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )
      }</div>

      {/* CREATE / EDIT TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-lg shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold">{taskForm.id ? 'Edit Task Details' : 'Assign New Task'}</h2>
            </div>
            
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title</label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleFormChange}
                  placeholder="Enter task title"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleFormChange}
                  placeholder="Provide task notes or details"
                  rows="3"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assign To</label>
                  {user?.role === 'ROLE_EMPLOYEE' ? (
                    <input
                      type="text"
                      name="assignedTo"
                      value={taskForm.assignedTo || user.username}
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed text-sm focus:outline-none"
                    />
                  ) : (
                    <select
                      name="assignedTo"
                      value={taskForm.assignedTo}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                    >
                      {employees.map(e => (
                        <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" key={e.id} value={e.username}>{e.username}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="LOW">Low</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="MEDIUM">Medium</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Due Date & Time</label>
                <input
                  type="datetime-local"
                  name="dueDate"
                  value={taskForm.dueDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm shadow-md transition-colors"
                >
                  {taskForm.id ? 'Save Changes' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAILS & COMMENTS MODAL */}
      {isDetailsModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-2xl shadow-2xl relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getPriorityStyle(selectedTask.priority)}`}>
                  {selectedTask.priority} Priority
                </span>
                <h2 className="text-xl font-extrabold mt-1">{selectedTask.title}</h2>
              </div>
              
              {/* Actions for Creator who assigned this task */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => openEditModal(selectedTask, e)}
                  disabled={selectedTask.assignedBy !== user.username}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedTask.assignedBy === user.username
                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700'
                      : 'opacity-40 cursor-not-allowed text-slate-400'
                  }`}
                  title={selectedTask.assignedBy === user.username ? "Edit Task" : "Only the creator who assigned this task can edit it"}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  disabled={selectedTask.assignedBy !== user.username}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedTask.assignedBy === user.username
                      ? 'hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600'
                      : 'opacity-40 cursor-not-allowed text-slate-400'
                  }`}
                  title={selectedTask.assignedBy === user.username ? "Delete Task" : "Only the creator who assigned this task can delete it"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Task Data Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-black p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">Assigned To</span>
                  <span className="font-semibold">{selectedTask.assignedTo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">Assigned By</span>
                  <span className="font-semibold">{selectedTask.assignedBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">Due Date</span>
                  <span className="font-semibold">
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleString() : 'No Deadline'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">Current Status</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-bold rounded-full border ${getStatusStyle(selectedTask.status)}`}>
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Description</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-white/30 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              {/* Hold Request notification banner for Task Creator */}
              {selectedTask.assignedBy === user.username && selectedTask.onHoldRequested && (
                <div className="bg-amber-55 dark:bg-amber-955/20 border border-amber-300 dark:border-amber-900/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-sm block">Hold Request Pending</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">The assignee has requested to put this task on hold.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRespondHold(selectedTask.id, true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Accept Hold
                    </button>
                    <button
                      onClick={() => handleRespondHold(selectedTask.id, false)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Reject Hold
                    </button>
                  </div>
                </div>
              )}

              {/* Status Update Control */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Update Progress Status</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'PENDING')}
                    disabled={selectedTask.assignedTo !== user.username || selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'COMPLETED' || selectedTask.status === 'ON_HOLD'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTask.status === 'PENDING'
                        ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                        : (selectedTask.assignedTo !== user.username || selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'COMPLETED' || selectedTask.status === 'ON_HOLD')
                        ? 'border-slate-105 dark:border-slate-850 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={
                      selectedTask.assignedTo !== user.username 
                        ? "Only the assignee can update status" 
                        : selectedTask.status === 'ON_HOLD'
                        ? "On-Hold tasks cannot be set directly back to Pending"
                        : (selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'COMPLETED')
                        ? "Completed or In Progress tasks cannot be set back to Pending"
                        : "Mark as Pending"
                    }
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}
                    disabled={selectedTask.assignedTo !== user.username || selectedTask.status === 'COMPLETED'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTask.status === 'IN_PROGRESS'
                        ? 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900 text-sky-800 dark:text-sky-300 shadow-sm'
                        : (selectedTask.assignedTo !== user.username || selectedTask.status === 'COMPLETED')
                        ? 'border-slate-105 dark:border-slate-850 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={
                      selectedTask.assignedTo !== user.username 
                        ? "Only the assignee can update status" 
                        : selectedTask.status === 'COMPLETED'
                        ? "Completed tasks cannot be changed"
                        : "Mark as In Progress"
                    }
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>In Progress</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'COMPLETED')}
                    disabled={selectedTask.assignedTo !== user.username || selectedTask.status === 'ON_HOLD'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTask.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 shadow-sm'
                        : (selectedTask.assignedTo !== user.username || selectedTask.status === 'ON_HOLD')
                        ? 'border-slate-105 dark:border-slate-850 text-slate-350 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={
                      selectedTask.assignedTo !== user.username 
                        ? "Only the assignee can update status" 
                        : selectedTask.status === 'ON_HOLD'
                        ? "On-Hold tasks must be put In Progress before they can be completed"
                        : "Mark as Completed"
                    }
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </button>

                  {selectedTask.status === 'COMPLETED' && (selectedTask.assignedBy === user.username || user.role === 'ROLE_ADMIN') && (
                    <button
                      onClick={() => {
                        setTaskForm({
                          id: selectedTask.id,
                          title: selectedTask.title,
                          description: selectedTask.description || '',
                          assignedTo: selectedTask.assignedTo,
                          priority: selectedTask.priority,
                          dueDate: selectedTask.dueDate ? selectedTask.dueDate.substring(0, 16) : '',
                          status: 'PENDING',
                        });
                        setIsCreateModalOpen(true);
                        setIsDetailsModalOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800/30 transition-all shadow-sm"
                      title="Reopen completed task"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Re-Open Task</span>
                    </button>
                                    {(() => {
                    const isAssignee = selectedTask.assignedTo === user.username;
                    const isCreator = selectedTask.assignedBy === user.username;
                    const isGeneralManager = user.role === 'ROLE_ADMIN';
                    const showRequestHold = isAssignee && !isCreator && !isGeneralManager;
                    
                    return showRequestHold && (selectedTask.status === 'PENDING' || selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'OVERDUE') && (
                      <button
                        onClick={() => handleRequestHold(selectedTask.id)}
                        disabled={selectedTask.onHoldRequested}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          selectedTask.onHoldRequested
                            ? 'bg-amber-50 border-amber-200 dark:bg-amber-955/20 dark:border-amber-900 text-amber-700 dark:text-amber-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title={
                          selectedTask.onHoldRequested
                            ? "Hold request is pending approval"
                            : "Submit Hold Request"
                        }
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{selectedTask.onHoldRequested ? 'Hold Requested' : 'Request for On-Hold'}</span>
                      </button>
                    );
                  })()}

                  {(user.role === 'ROLE_ADMIN' || selectedTask.assignedBy === user.username) && (selectedTask.status === 'PENDING' || selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'ON_HOLD' || selectedTask.status === 'OVERDUE') && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTask.id, selectedTask.status === 'ON_HOLD' ? 'IN_PROGRESS' : 'ON_HOLD')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedTask.status === 'ON_HOLD'
                          ? 'bg-amber-55 border-amber-300 dark:bg-amber-955/30 dark:border-amber-900 text-amber-800 dark:text-amber-300 shadow-sm hover:opacity-90'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                      title={
                        selectedTask.status === 'ON_HOLD'
                          ? "Resume Task (set to In Progress)"
                          : "Mark as On-Hold"
                      }
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{selectedTask.status === 'ON_HOLD' ? 'Resume Task' : 'Mark as On-Hold'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <MessageSquare className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Comments Feed</h4>
                </div>

                {/* Comments List */}
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {!selectedTask.comments || selectedTask.comments.length === 0 ? (
                    <span className="text-slate-400 dark:text-slate-600 text-xs italic block py-2">No comments posted yet.</span>
                  ) : (
                    selectedTask.comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-bold">{comment.author}</span>
                          <span>{new Date(comment.createdDate).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comments Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors shadow-sm"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/20">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAY TASKS PREVIEW MODAL */}
      {isDayTasksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsDayTasksModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-md shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Tasks for Day</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </p>
              </div>
              <button
                onClick={() => setIsDayTasksModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task list container */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No tasks scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => {
                    const isTaskOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.status !== 'ON_HOLD' && task.dueDate && new Date(task.dueDate) < new Date());
                    const displayStatus = isTaskOverdue ? 'OVERDUE' : task.status;
                    let borderClass = 'border-rose-200 dark:border-rose-900/30';
                    if (task.status === 'COMPLETED') {
                      borderClass = 'border-emerald-200 dark:border-emerald-900/30';
                    } else if (!isTaskOverdue) {
                      borderClass = 'border-amber-200 dark:border-amber-900/30';
                    }
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleViewTaskDetailsFromDayModal(task)}
                        className={`p-4 rounded-2xl border bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm ${borderClass}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${getStatusStyle(displayStatus)}`}>
                            {displayStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                          <div className="flex items-center gap-1 max-w-[200px]" title={`${task.assignedBy} ➔ ${task.assignedTo}`}>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{task.assignedBy}</span>
                            <span className="mx-1 text-[11px] font-black text-slate-400 dark:text-slate-500 shrink-0">➔</span>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{task.assignedTo}</span>
                          </div>
                          {task.dueDate && (
                            <span>{new Date(task.dueDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer / Assign Option */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDayTasksModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAssignTaskFromDayModal}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
