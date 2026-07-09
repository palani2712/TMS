import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import { 
  History, 
  Search, 
  Clock, 
  User, 
  Terminal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AuditLogs = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load audit logs.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [logs, searchQuery]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE')) return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30';
    if (action.includes('DELETE')) return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30';
    if (action.includes('PERMISSION') || action.includes('PASSWORD')) return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30';
    return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30';
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Audit Trail</h1>
        <p className="text-slate-500 dark:text-slate-400">Review security logs and administrative changes across the organization.</p>
      </div>

      {/* Filter toolbar */}
      <div className="glass p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by action, user or details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading security logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center shadow-sm">
          <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg">No audit events recorded</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">Audit events will be logged here when administrative operations occur.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4">Time</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Performed By</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 font-medium text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* User */}
                      <td className="p-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.performedBy}</span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-2">{log.details}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
