import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API, { getErrorMessage, formatDate, formatDateTime } from '../services/api';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Calendar as CalendarIcon, 
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
  FileText,
  X,
  Pin
} from 'lucide-react';

const Calendar = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState(() => localStorage.getItem('tms-calendar-assignmentFilter') || 'ALL');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentModalTime, setCurrentModalTime] = useState(new Date());

  // Calendar State
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

  // Day Tasks Modal State
  const [isDayTasksModalOpen, setIsDayTasksModalOpen] = useState(false);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Floating Notes State
  const [isFloatingNotesOpen, setIsFloatingNotesOpen] = useState(false);
  const [floatingNotesTabs, setFloatingNotesTabs] = useState([]);
  const [floatingActiveTabId, setFloatingActiveTabId] = useState('');
  const [floatingEditingTabId, setFloatingEditingTabId] = useState('');
  const [floatingEditName, setFloatingEditName] = useState('');
  const [selectedAssigneeRole, setSelectedAssigneeRole] = useState('ROLE_EMPLOYEE');

  // Draggable Notes Position State
  const modalRef = useRef(null);
  const [floatingNotesPos, setFloatingNotesPos] = useState({ x: 0, y: 0 });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const dragNotesStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isFloatingNotesOpen) {
      setFloatingNotesPos({
        x: window.innerWidth - 384 - 24,
        y: window.innerHeight - 480 - 24
      });
    }
  }, [isFloatingNotesOpen]);

  useEffect(() => {
    const handleWindowResize = () => {
      if (!isFloatingNotesOpen) return;
      setFloatingNotesPos(prev => {
        const rect = modalRef.current ? modalRef.current.getBoundingClientRect() : { width: 384, height: 480 };
        return {
          x: Math.max(0, Math.min(prev.x, window.innerWidth - rect.width)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - rect.height))
        };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isFloatingNotesOpen]);

  const handleNotesMouseDown = (e) => {
    if (e.button !== 0) return;
    if (
      e.target.closest('button') || 
      e.target.closest('input') || 
      e.target.closest('textarea') ||
      e.target.closest('.resize-handle')
    ) {
      return;
    }
    setIsDraggingNotes(true);
    dragNotesStartRef.current = {
      x: e.clientX - floatingNotesPos.x,
      y: e.clientY - floatingNotesPos.y
    };
  };

  useEffect(() => {
    const handleNotesMouseMove = (e) => {
      if (!isDraggingNotes) return;
      const rect = modalRef.current ? modalRef.current.getBoundingClientRect() : { width: 384, height: 480 };
      
      let newX = e.clientX - dragNotesStartRef.current.x;
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));

      let newY = e.clientY - dragNotesStartRef.current.y;
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

      setFloatingNotesPos({ x: newX, y: newY });
    };

    const handleNotesMouseUp = () => {
      setIsDraggingNotes(false);
    };

    if (isDraggingNotes) {
      window.addEventListener('mousemove', handleNotesMouseMove);
      window.addEventListener('mouseup', handleNotesMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleNotesMouseMove);
      window.removeEventListener('mouseup', handleNotesMouseUp);
    };
  }, [isDraggingNotes]);

  // Load Floating Notes
  const fetchFloatingNotes = async () => {
    try {
      const res = await API.get('/notes/tabs');
      setFloatingNotesTabs(res.data);
      if (res.data.length > 0 && !floatingActiveTabId) {
        setFloatingActiveTabId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch notes tabs:", err);
    }
  };

  useEffect(() => {
    if (isFloatingNotesOpen) {
      fetchFloatingNotes();
    }
  }, [isFloatingNotesOpen]);

  const handleCreateFloatingTab = async () => {
    try {
      const res = await API.post('/notes/tabs', { name: `Note ${floatingNotesTabs.length + 1}` });
      setFloatingNotesTabs(prev => [...prev, res.data]);
      setFloatingActiveTabId(res.data.id);
    } catch (err) {
      showToast('Failed to create note tab.', 'error');
    }
  };

  const handleRenameFloatingTab = async (tabId) => {
    if (!floatingEditName.trim()) return;
    try {
      await API.put(`/notes/tabs/${tabId}`, { name: floatingEditName.trim() });
      setFloatingNotesTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: floatingEditName.trim() } : t));
      setFloatingEditingTabId('');
    } catch (err) {
      showToast('Failed to rename note tab.', 'error');
    }
  };

  const handleDeleteFloatingTab = async (tabId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note tab and all its content?')) return;
    try {
      await API.delete(`/notes/tabs/${tabId}`);
      setFloatingNotesTabs(prev => prev.filter(t => t.id !== tabId));
      if (floatingActiveTabId === tabId) {
        setFloatingActiveTabId(floatingNotesTabs.find(t => t.id !== tabId)?.id || '');
      }
    } catch (err) {
      showToast('Failed to delete note tab.', 'error');
    }
  };

  const handleUpdateFloatingContent = async (tabId, newContent) => {
    try {
      setFloatingNotesTabs(prev => prev.map(t => t.id === tabId ? { ...t, content: newContent } : t));
      await API.put(`/notes/tabs/${tabId}`, { content: newContent });
    } catch (err) {
      console.error("Failed to auto-save note content:", err);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const tasksRes = await API.get('/tasks');
      setTasks(tasksRes.data);

      if (user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER') {
        const empRes = await API.get('/users/employees');
        setEmployees(empRes.data);
      }
    } catch (err) {
      showToast('Failed to load dashboard data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Keep modal clock running
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentModalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isCreateModalOpen]);

  // Handle Input Changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dueDate' && value) {
      const prevDatePart = taskForm.dueDate ? taskForm.dueDate.substring(0, 10) : '';
      const newDatePart = value.substring(0, 10);
      if (prevDatePart !== newDatePart) {
        setTaskForm(prev => ({ ...prev, dueDate: `${newDatePart}T23:59` }));
        return;
      }
    }
    setTaskForm(prev => ({ ...prev, [name]: value }));
  };

  // Helper to get current time in ISO local format defaulting to 23:59
  const getCurrentLocalDateTime = (targetDate = new Date()) => {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  };

  const openCreateModalForDate = (date) => {
    const localDateTime = getCurrentLocalDateTime(date);
    const defaultAssignee = user.role === 'ROLE_EMPLOYEE' ? user.username : (employees[0]?.username || '');
    const defaultRole = user.role === 'ROLE_EMPLOYEE' ? user.role : (employees.find(emp => emp.username === defaultAssignee)?.role || 'ROLE_EMPLOYEE');
    
    setTaskForm({
      id: null,
      title: '',
      description: '',
      assignedTo: defaultAssignee,
      priority: 'MEDIUM',
      dueDate: localDateTime,
    });
    setSelectedAssigneeRole(defaultRole);
    setIsCreateModalOpen(true);
  };

  const handleCalendarDayClick = (date) => {
    const dayTasks = getTasksForDay(date);
    setSelectedDate(date);
    setSelectedDateTasks(dayTasks);
    setIsDayTasksModalOpen(true);
  };

  const handleAssignTaskFromDayModal = () => {
    setIsDayTasksModalOpen(false);
    openCreateModalForDate(selectedDate);
  };

  const handleViewTaskDetailsFromDayModal = (task) => {
    setIsDayTasksModalOpen(false);
    openDetailsModal(task);
  };

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
    const targetUser = employees.find(emp => emp.username === task.assignedTo);
    setSelectedAssigneeRole(targetUser?.role || 'ROLE_EMPLOYEE');
    setIsCreateModalOpen(true);
    setIsDetailsModalOpen(false);
  };

  const openDetailsModal = async (task) => {
    try {
      const res = await API.get(`/tasks/${task.id}`);
      setSelectedTask(res.data);
      setIsDetailsModalOpen(true);
    } catch (err) {
      showToast('Failed to fetch task details.', 'error');
    }
  };

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
        await API.put(`/tasks/${taskForm.id}`, payload);
        showToast('Task updated successfully.', 'success');
      } else {
        await API.post('/tasks', payload);
        showToast('Task assigned successfully.', 'success');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to save task.'), 'error');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status?status=${newStatus}`);
      showToast(`Task status updated to ${newStatus.replace('_', ' ')}.`, 'success');
      
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
      showToast(getErrorMessage(err, 'Failed to submit hold request.'), 'error');
    }
  };

  const handleRespondHold = async (taskId, approved) => {
    try {
      const res = await API.post(`/tasks/${taskId}/respond-hold?approved=${approved}`);
      showToast(approved ? 'Hold request approved.' : 'Hold request rejected.', 'success');
      setSelectedTask(res.data);
      fetchData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to respond to hold request.'), 'error');
    }
  };

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

  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await API.delete(`/tasks/${taskId}`);
      showToast('Task deleted successfully.', 'success');
      setIsDetailsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete task.'), 'error');
    }
  };

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
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
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assignmentFilter, user.username]);

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
    return filteredTasks.filter(task => {
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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Task Calendar
          </h1>
          <p className="text-slate-500 dark:text-slate-400">View and schedule tasks across the calendar.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsFloatingNotesOpen(!isFloatingNotesOpen)}
            className={`p-2.5 rounded-xl font-medium text-sm transition-all border flex items-center justify-center h-[40px] w-[40px] shrink-0 bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90`}
            title="Floating Notes"
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* Assignment Filters */}
          {user?.role === 'ROLE_EMPLOYEE' && (
            <button
              onClick={() => {
                setAssignmentFilter('ALL');
                localStorage.setItem('tms-calendar-assignmentFilter', 'ALL');
              }}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border ${
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
                  localStorage.setItem('tms-calendar-assignmentFilter', 'ALL');
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border ${
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
                  localStorage.setItem('tms-calendar-assignmentFilter', 'ASSIGNED_TO_OTHERS');
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border ${
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
                  localStorage.setItem('tms-calendar-assignmentFilter', 'SELF_ASSIGNED');
                }}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border ${
                  assignmentFilter === 'SELF_ASSIGNED'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md hover:bg-primary-700 hover:border-primary-700'
                    : 'bg-[var(--color-button-secondary-bg)] border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] hover:opacity-90'
                }`}
              >
                My Tasks
              </button>
            </>
          )}

          <button 
            onClick={() => openCreateModalForDate(new Date())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-button-secondary-border)] hover:opacity-90 font-medium text-sm transition-all text-[var(--color-button-secondary-text)] bg-[var(--color-button-secondary-bg)] shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{user?.role === 'ROLE_EMPLOYEE' ? 'Add Task' : 'Assign Task'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Task Listing */}
      <div className="space-y-6">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          {/* Selector filters */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-end gap-3 w-full lg:w-auto">
            {/* Status Select */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-[var(--color-button-secondary-text)] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-semibold"
              >
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ALL">All Priorities</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="HIGH">High</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="MEDIUM">Medium</option>
                <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading / Calendar list */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-slate-500 text-sm font-medium">Fetching assignments...</span>
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
                const hasDeadlines = dayTasks.length > 0;
                const allCompleted = hasDeadlines && dayTasks.every(task => task.status === 'COMPLETED');
                const noneCompleted = hasDeadlines && dayTasks.every(task => task.status !== 'COMPLETED');
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleCalendarDayClick(day.date)}
                    className={`min-h-[80px] p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer group/cell ${
                      day.isCurrentMonth
                        ? hasDeadlines
                          ? allCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 shadow-sm'
                            : noneCompleted
                              ? 'bg-rose-100 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900/30 shadow-sm'
                              : 'bg-amber-100 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900/30 shadow-sm'
                          : 'bg-white/40 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 hover:bg-white/60 dark:hover:bg-slate-900/60'
                        : 'bg-slate-50/20 dark:bg-slate-950/10 border-transparent text-slate-400 dark:text-slate-600'
                    } ${
                      isToday
                        ? 'ring-2 ring-primary-500 border-transparent bg-primary-50/10 dark:bg-primary-950/10'
                        : ''
                    }`}
                  >
                    <span className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${
                      isToday 
                        ? 'bg-primary-500 text-white' 
                        : hasDeadlines
                          ? allCompleted
                            ? 'bg-emerald-500 text-white shadow-sm font-black'
                            : noneCompleted
                              ? 'bg-rose-500 text-white shadow-sm font-black'
                              : 'bg-amber-500 text-white shadow-sm font-black'
                          : day.isCurrentMonth
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400/70 dark:text-slate-600'
                    }`}>
                      {day.date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-lg shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">{taskForm.id ? 'Edit Task Details' : 'Assign New Task'}</h2>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/55 dark:bg-slate-900/55 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                {(() => {
                  const day = String(currentModalTime.getDate()).padStart(2, '0');
                  const month = String(currentModalTime.getMonth() + 1).padStart(2, '0');
                  const year = currentModalTime.getFullYear();
                  const hours = String(currentModalTime.getHours()).padStart(2, '0');
                  const minutes = String(currentModalTime.getMinutes()).padStart(2, '0');
                  return `${hours}:${minutes}   ${day}/${month}/${year}`;
                })()}
              </div>
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
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description (Optional)</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleFormChange}
                  placeholder="Enter task details..."
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {user?.role !== 'ROLE_EMPLOYEE' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assign To Role</label>
                      <select
                        value={selectedAssigneeRole}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          setSelectedAssigneeRole(newRole);
                          const filtered = employees.filter(emp => emp.role === newRole);
                          if (filtered.length > 0) {
                            setTaskForm(prev => ({ ...prev, assignedTo: filtered[0].username }));
                          } else {
                            setTaskForm(prev => ({ ...prev, assignedTo: '' }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--color-button-secondary-bg)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-medium"
                      >
                        <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ROLE_ADMIN">General Manager</option>
                        <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ROLE_MANAGER">Manager</option>
                        <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="ROLE_EMPLOYEE">Employee</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assign To User</label>
                      <select
                        name="assignedTo"
                        value={taskForm.assignedTo}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--color-button-secondary-bg)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-medium"
                        required
                      >
                        {employees.filter(emp => emp.role === selectedAssigneeRole).map((emp) => (
                          <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" key={emp.id} value={emp.username}>
                            {emp.username} ({emp.fullName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={user?.role === 'ROLE_EMPLOYEE' ? 'col-span-2' : 'col-span-2'}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--color-button-secondary-bg)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-medium"
                  >
                    <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="LOW">Low</option>
                    <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="MEDIUM">Medium</option>
                    <option className="bg-[var(--color-bg-card)] text-[var(--color-text-main)] dark:bg-slate-900 dark:text-slate-200" value="HIGH">High</option>
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
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  {taskForm.id ? 'Save Changes' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS VIEW MODAL */}
      {isDetailsModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="glass rounded-3xl w-full max-w-lg shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getPriorityStyle(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
                <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-white leading-tight">{selectedTask.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => openEditModal(selectedTask, e)}
                  disabled={selectedTask.assignedBy !== user.username}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedTask.assignedBy === user.username
                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      : 'opacity-40 cursor-not-allowed text-slate-350'
                  }`}
                  title={selectedTask.assignedBy === user.username ? "Edit Task" : "Only the creator who assigned this task can edit it"}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => handleDeleteTask(selectedTask.id, e)}
                  disabled={selectedTask.assignedBy !== user.username}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedTask.assignedBy === user.username
                      ? 'hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600'
                      : 'opacity-40 cursor-not-allowed text-slate-450'
                  }`}
                  title={selectedTask.assignedBy === user.username ? "Delete Task" : "Only the creator who assigned this task can delete it"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    {selectedTask.dueDate ? formatDateTime(selectedTask.dueDate) : 'No Deadline'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">Current Status</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-bold rounded-full border ${getStatusStyle(selectedTask.status)}`}>
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Description</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-white/30 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

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
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}
                    disabled={selectedTask.assignedTo !== user.username || selectedTask.status === 'COMPLETED'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTask.status === 'IN_PROGRESS'
                        ? 'bg-sky-50 border-sky-200 dark:bg-sky-955/30 dark:border-sky-900 text-sky-800 dark:text-sky-300 shadow-sm'
                        : (selectedTask.assignedTo !== user.username || selectedTask.status === 'COMPLETED')
                        ? 'border-slate-105 dark:border-slate-850 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>In Progress</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'COMPLETED')}
                    disabled={selectedTask.assignedTo !== user.username || selectedTask.status === 'ON_HOLD'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTask.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-955/30 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 shadow-sm'
                        : (selectedTask.assignedTo !== user.username || selectedTask.status === 'ON_HOLD')
                        ? 'border-slate-105 dark:border-slate-850 text-slate-350 dark:text-slate-650 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
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
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Re-Open Task</span>
                    </button>
                  )}

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
                            ? 'bg-amber-55 border-amber-200 dark:bg-amber-955/20 dark:border-amber-900 text-amber-700 dark:text-amber-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
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
                          ? 'bg-amber-55 border-amber-300 dark:bg-amber-955/30 dark:border-amber-900 text-amber-805 dark:text-amber-300 shadow-sm hover:opacity-90'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
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

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {!selectedTask.comments || selectedTask.comments.length === 0 ? (
                    <span className="text-slate-400 dark:text-slate-650 text-xs italic block py-2">No comments posted yet.</span>
                  ) : (
                    selectedTask.comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-bold">{comment.author}</span>
                          <span>{formatDateTime(comment.createdDate)}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

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
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Tasks for Day</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {selectedDate ? formatDate(selectedDate) : ''}
                </p>
              </div>
              <button
                onClick={() => setIsDayTasksModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                          <div className="flex items-center gap-1" title={`${task.assignedBy} ➔ ${task.assignedTo}`}>
                            <User className="w-3 h-3 shrink-0" />
                            <span>{task.assignedBy}</span>
                            <span className="mx-1 text-[11px] font-black text-slate-400 dark:text-slate-500 shrink-0">➔</span>
                            <User className="w-3 h-3 shrink-0" />
                            <span>{task.assignedTo}</span>
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

      {/* Floating Quick Notes */}
      {isFloatingNotesOpen && createPortal(
        <div 
          ref={modalRef}
          style={{ 
            left: `${floatingNotesPos.x}px`, 
            top: `${floatingNotesPos.y}px` 
          }}
          className="fixed w-96 h-[480px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in duration-200 resize min-w-[280px] min-h-[300px] max-w-[90vw] max-h-[90vh]"
        >
          <div 
            onMouseDown={handleNotesMouseDown}
            className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-955/20 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              <span className="font-bold text-sm">Quick Notes</span>
            </div>
            <button
              onClick={() => setIsFloatingNotesOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-3 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto scrollbar-none bg-slate-50/20 dark:bg-slate-955/10 animate-none">
            {floatingNotesTabs.map((tab) => (
              <div 
                key={tab.id}
                onClick={() => setFloatingActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  floatingActiveTabId === tab.id
                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950/20 dark:border-primary-900/50 dark:text-primary-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50/30'
                }`}
              >
                {floatingEditingTabId === tab.id ? (
                  <input
                    type="text"
                    value={floatingEditName}
                    onChange={(e) => setFloatingEditName(e.target.value)}
                    onBlur={() => handleRenameFloatingTab(tab.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameFloatingTab(tab.id)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none w-16"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={() => {
                      setFloatingEditingTabId(tab.id);
                      setFloatingEditName(tab.name);
                    }}
                    className="truncate max-w-[80px]" 
                    title="Double click to rename"
                  >
                    {tab.name}
                  </span>
                )}
                <button 
                  onClick={(e) => handleDeleteFloatingTab(tab.id, e)}
                  className="hover:text-rose-500 font-bold transition-colors text-[9px] shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              onClick={handleCreateFloatingTab}
              className="flex items-center justify-center p-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-primary-500 hover:border-primary-500 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-4 bg-slate-50/10 dark:bg-slate-950/5">
            {(() => {
              const activeTab = floatingNotesTabs.find(t => t.id === floatingActiveTabId);
              return activeTab ? (
                <textarea
                  value={activeTab.content || ''}
                  onChange={(e) => handleUpdateFloatingContent(activeTab.id, e.target.value)}
                  placeholder="Type notes here... (Auto-saves)"
                  className="w-full h-full bg-transparent border-none focus:outline-none text-sm font-medium resize-none leading-relaxed"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Select or create a tab to start writing notes.
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Calendar;
