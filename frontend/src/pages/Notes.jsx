import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Trash2 } from 'lucide-react';

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');

  // Load notes from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedNotes = localStorage.getItem(`user-notes-${user.username}`) || '';
      setNotes(savedNotes);
    }
  }, [user]);

  // Save notes to localStorage on change
  const handleChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    if (user) {
      localStorage.setItem(`user-notes-${user.username}`, val);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all notes?")) {
      setNotes('');
      if (user) {
        localStorage.removeItem(`user-notes-${user.username}`);
      }
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      {/* Header */}
      <div className="pl-4 flex gap-3 items-start justify-between">
        <div className="flex gap-3 items-start">
          <FileText className="w-8 h-8 text-primary-500 mt-1 shrink-0" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Notes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Write down your thoughts, scratchpads, and persistent reminders.
            </p>
          </div>
        </div>
        {notes.trim() && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-450 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
            title="Clear all notes"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Notes</span>
          </button>
        )}
      </div>

      {/* Editor pad */}
      <div className="flex-1 glass p-6 rounded-3xl shadow-sm flex flex-col border border-slate-100 dark:border-slate-800/60 overflow-hidden min-h-[400px]">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Start typing your notes here... (they are saved automatically)"
          className="flex-1 w-full bg-transparent resize-none border-none outline-none focus:ring-0 text-slate-850 dark:text-slate-100 text-base leading-relaxed placeholder:text-slate-450 placeholder:italic"
        />
      </div>
    </div>
  );
};

export default Notes;
