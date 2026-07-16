import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, X, Edit2, Check } from 'lucide-react';

const Notes = () => {
  const { user } = useAuth();
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [editingTabId, setEditingTabId] = useState('');
  const [editName, setEditName] = useState('');
  const renameInputRef = useRef(null);

  // Initialize tabs from localStorage on mount
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`user-notes-tabs-${user.username}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setTabs(parsed);
            setActiveTabId(parsed[0].id);
            return;
          }
        } catch (e) {
          console.error("Failed to parse saved notes tabs", e);
        }
      }
      
      // Default initial tab
      const defaultTabs = [{ id: 'default-' + Date.now(), name: 'General', content: '' }];
      setTabs(defaultTabs);
      setActiveTabId(defaultTabs[0].id);
    }
  }, [user]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingTabId]);

  // Save all tabs state to localStorage
  const saveToStorage = (updatedTabs) => {
    if (user) {
      localStorage.setItem(`user-notes-tabs-${user.username}`, JSON.stringify(updatedTabs));
    }
  };

  // Add a new tab
  const handleAddTab = () => {
    const newTabId = 'tab-' + Date.now();
    const newTabNumber = tabs.length + 1;
    const newTab = {
      id: newTabId,
      name: `Note ${newTabNumber}`,
      content: ''
    };
    const updated = [...tabs, newTab];
    setTabs(updated);
    setActiveTabId(newTabId);
    saveToStorage(updated);
  };

  // Delete a tab
  const handleDeleteTab = (e, tabIdToDelete) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      alert("You must keep at least one note tab.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this tab? This cannot be undone.")) {
      const updated = tabs.filter(t => t.id !== tabIdToDelete);
      setTabs(updated);
      
      // If active tab was deleted, pick the first available one
      if (activeTabId === tabIdToDelete) {
        const nextActive = updated[0]?.id || '';
        setActiveTabId(nextActive);
      }
      saveToStorage(updated);
    }
  };

  // Handle typing inside the active tab
  const handleContentChange = (e) => {
    const val = e.target.value;
    const updated = tabs.map(t => {
      if (t.id === activeTabId) {
        return { ...t, content: val };
      }
      return t;
    });
    setTabs(updated);
    saveToStorage(updated);
  };

  // Rename action trigger
  const startRenaming = (tab) => {
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  // Save renamed tab
  const handleSaveRename = () => {
    if (!editName.trim()) {
      setEditingTabId('');
      return;
    }
    const updated = tabs.map(t => {
      if (t.id === editingTabId) {
        return { ...t, name: editName.trim() };
      }
      return t;
    });
    setTabs(updated);
    setEditingTabId('');
    saveToStorage(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditingTabId('');
    }
  };

  // Find active tab object
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto w-full h-full flex flex-col">
      {/* Header */}
      <div className="pl-4 flex gap-3 items-start justify-between">
        <div className="flex gap-3 items-start">
          <FileText className="w-8 h-8 text-primary-500 mt-1 shrink-0" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Notes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Organize your thoughts into multiple custom tabs. All notes autosave.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 flex-nowrap">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = tab.id === editingTabId;
            
            return (
              <div
                key={tab.id}
                onClick={() => !isEditing && setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer select-none h-10 shrink-0 ${
                  isActive
                    ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] border-[var(--color-border-main)] shadow-sm'
                    : 'bg-white/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={handleKeyDown}
                      className="bg-transparent border-none outline-none focus:ring-0 text-slate-850 dark:text-slate-100 w-24 py-0.5 px-0 text-sm font-semibold"
                    />
                    <button onClick={handleSaveRename} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2" onDoubleClick={() => startRenaming(tab)}>
                    <span className="truncate max-w-[120px]" title="Double click to rename">{tab.name}</span>
                    
                    {isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenaming(tab);
                        }}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity"
                        title="Rename note tab"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteTab(e, tab.id)}
                        className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 transition-colors"
                        title="Delete note tab"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Tab Button */}
        <button
          onClick={handleAddTab}
          className="flex items-center justify-center p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-500 hover:bg-primary-50/20 dark:hover:bg-primary-950/10 transition-all h-10 w-10 shrink-0 cursor-pointer"
          title="Create a new note tab"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Editor pad */}
      <div className="flex-1 glass p-6 rounded-3xl shadow-sm flex flex-col border border-slate-100 dark:border-slate-800/60 overflow-hidden min-h-[420px]">
        <textarea
          value={activeTab?.content || ''}
          onChange={handleContentChange}
          placeholder="Start typing your notes here... (saved automatically under this tab)"
          className="flex-1 w-full bg-transparent resize-none border-none outline-none focus:ring-0 text-slate-850 dark:text-slate-100 text-base leading-relaxed placeholder:text-slate-450 placeholder:italic"
        />
      </div>
    </div>
  );
};

export default Notes;
