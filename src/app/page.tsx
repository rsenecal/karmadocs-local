'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for the Tiptap editor to prevent SSR issues
const Editor = dynamic(() => import('@/components/Editor'), { 
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-white border border-slate-200 rounded-xl animate-pulse flex items-center justify-center text-slate-400 font-medium uppercase tracking-widest">
      Initialising Workspace...
    </div>
  )
});

const CATEGORIES = [
  "Student Management", 
  "Video Tutorials", 
  "Getting Started", 
  "Reports & Analytics", 
  "Studio Operations", 
  "Integrations", 
  "Staff Management"
];

export default function MigratorPage() {
  // State Management
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[2]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceMode, setSourceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dashboard Calculations
  const liveArticles = articles.filter(a => a.pushedToLive).length;
  const stagedArticles = articles.filter(a => a.localModified && !a.pushedToLive).length;
  const totalArticles = articles.length;
  const percentComplete = totalArticles > 0 ? Math.round((liveArticles / totalArticles) * 100) : 0;

  // Filtered List for Sidebar
  const filteredArticles = Array.isArray(articles) 
    ? articles.filter(article => 
        article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.category?.toLowerCase().includes(searchTerm.toLowerCase())
      ) : [];

  // Initial Data Fetch
  useEffect(() => {
    setLoading(true);
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(err => console.error("Initial load error:", err))
      .finally(() => setLoading(false));
  }, []);

  // UI Feedback Helper
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Local Save Logic
  const saveLocally = async () => {
    if (!selectedArticle) return;
    setIsSaving(true);
    const now = new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    try {
      const res = await fetch('/api/articles/save-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedArticle.id, 
          content: editedHtml, 
          title: selectedArticle.title, 
          category: selectedCategory, 
          lastModified: now 
        }),
      });
      if (res.ok) {
        const updated = { 
          ...selectedArticle, 
          content: editedHtml, 
          title: selectedArticle.title, 
          category: selectedCategory, 
          localModified: true, 
          lastModified: now 
        };
        // Update both master list and current selection to trigger re-render
        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...updated } : a));
        setSelectedArticle({ ...updated });
        showStatus("Draft Saved Locally");
      }
    } catch (err) { showStatus("Save Failed", "error"); }
    finally { setIsSaving(false); }
  };

  // Firebase Push Logic
  const pushLive = async () => {
    if (!selectedArticle) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/articles/push-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedArticle.id, 
          title: selectedArticle.title, 
          slug: selectedArticle.slug, 
          content: editedHtml, 
          category: selectedCategory 
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const updated = { 
          ...selectedArticle, 
          pushedToLive: true, 
          localModified: false, 
          id: result.firebaseId, 
          lastSyncedAt: result.lastSyncedAt 
        };
        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...updated } : a));
        setSelectedArticle({ ...updated });
        showStatus("Successfully Pushed Live!");
      } else { showStatus(result.error || "Push failed", 'error'); }
    } catch (err) { showStatus("Network Error", 'error'); }
    finally { setIsSaving(false); }
  };

  // Bulk Action Logic
  const pushSelectedLive = async () => {
    const toPush = articles.filter(a => selectedIds.includes(a.id));
    if (toPush.length === 0) return;
    if (!confirm(`Push ${toPush.length} selected articles to Firebase?`)) return;
    setIsSaving(true);
    for (const article of toPush) {
      try {
        const res = await fetch('/api/articles/push-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...article }),
        });
        if (res.ok) {
          const result = await res.json();
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, pushedToLive: true, localModified: false, id: result.firebaseId, lastSyncedAt: result.lastSyncedAt } : a));
        }
      } catch (err) { console.error(err); }
    }
    setSelectedIds([]);
    setIsSaving(false);
    showStatus("Bulk Push Complete");
  };

  const deleteArticle = async () => {
    if (!selectedArticle) return;
    if (!confirm(`Permanently delete "${selectedArticle.title}"?`)) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/articles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedArticle.id }),
      });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== selectedArticle.id));
        setSelectedArticle(null);
        showStatus("Article Deleted");
      }
    } finally { setIsSaving(false); }
  };

  const syncFromFirebase = async () => {
    if (!confirm("Overwrite local database with Firebase data?")) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/articles?sync=true');
      const data = await res.json();
      if (!data.error) {
        setArticles(data);
        showStatus("Local Database Synced");
      }
    } finally { setIsSyncing(false); }
  };

  const toggleSelection = (id: any) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAllStaged = () => setSelectedIds(articles.filter(a => a.localModified && !a.pushedToLive).map(a => a.id));

  // Sync Editor when selection changes
  useEffect(() => {
    if (selectedArticle) {
      setEditedHtml(selectedArticle.content || '');
      setSelectedCategory(selectedArticle.category || CATEGORIES[2]);
    }
  }, [selectedArticle?.id]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-400 bg-slate-50 uppercase tracking-[0.2em]">Initialising Workspace...</div>;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg tracking-tight">karmaDocs</h2>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Migration Dashboard</p>
            </div>
            <span className="text-2xl font-black text-blue-600 leading-none">{percentComplete}%</span>
          </div>

          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${percentComplete}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
              <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Live</p>
              <p className="text-lg font-black text-green-600 leading-none">{liveArticles}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
              <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Staged</p>
              <p className="text-lg font-black text-blue-500 leading-none">{stagedArticles}</p>
            </div>
          </div>

          <div className="relative mb-4">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
            <div className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</div>
          </div>

          {selectedIds.length > 0 ? (
            <button onClick={pushSelectedLive} disabled={isSaving} className="w-full mb-3 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50">🚀 Push {selectedIds.length} Selected</button>
          ) : (
            <button onClick={() => { const newId = Date.now(); const n = { id: newId, title: "Untitled New Article", content: "", category: "Getting Started", localModified: true }; setArticles(p => [n, ...p]); setSelectedArticle(n); }} className="w-full mb-3 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-md active:scale-95">+ New Article</button>
          )}

          <div className="flex gap-2">
            <button onClick={selectAllStaged} className="flex-1 text-[9px] font-bold border py-1.5 rounded-lg bg-white hover:bg-slate-50 uppercase tracking-tighter transition-all">Staged</button>
            <button onClick={syncFromFirebase} disabled={isSyncing} className="flex-1 text-[9px] font-bold border py-1.5 rounded-lg bg-white hover:bg-slate-50 uppercase tracking-tighter disabled:opacity-50">{isSyncing ? '...' : 'Import DB'}</button>
          </div>
        </div>
        
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {filteredArticles.map((article) => (
            <div key={article.id} className="flex items-center border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
              <div className="pl-4">
                <input type="checkbox" checked={selectedIds.includes(article.id)} onChange={() => toggleSelection(article.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
              </div>
              <button onClick={() => setSelectedArticle({ ...article })} className={`flex-1 text-left p-4 transition-all ${selectedArticle?.id === article.id ? 'bg-blue-50 border-r-4 border-r-blue-600 shadow-inner' : ''}`}>
                <p className={`text-sm font-bold leading-tight truncate ${selectedArticle?.id === article.id ? 'text-blue-800' : 'text-slate-800'}`}>{article.title}</p>
                
                <div className="flex flex-col gap-1.5 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black uppercase text-slate-400">{article.category}</span>
                    {article.pushedToLive ? <span className="text-[9px] text-green-600 font-black uppercase flex items-center gap-1">● Live</span> : article.localModified && <span className="text-[9px] text-blue-500 font-black uppercase flex items-center gap-1">● Staged</span>}
                  </div>
                  
                  {/* FIREBASE SYNC BADGE (BLUE) */}
                  {article.lastSyncedAt && (
                    <div className="bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter w-fit shadow-sm">
                      Synced: {article.lastSyncedAt}
                    </div>
                  )}

                  {/* LOCAL SAVE BADGE (EMERALD) */}
                  {article.lastModified && (
                    <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter w-fit shadow-sm">
                      Saved: {article.lastModified}
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-12 relative bg-slate-50/30">
        {statusMessage && (
          <div className={`fixed top-10 right-10 px-6 py-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 text-white font-bold text-sm ${statusMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {statusMessage.text}
          </div>
        )}

        {selectedArticle ? (
          <div className="max-w-4xl mx-auto">
            <header className="mb-10">
              <div className="flex justify-between items-end gap-10">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Article Title</label>
                  <input 
                    value={selectedArticle.title} 
                    onChange={(e) => { 
                      const nt = e.target.value; 
                      setSelectedArticle({...selectedArticle, title: nt}); 
                      setArticles(prev => prev.map(a => a.id === selectedArticle.id ? {...a, title: nt} : a)); 
                    }} 
                    className="text-4xl font-black text-slate-900 w-full bg-transparent border-none outline-none focus:ring-0 p-0 leading-tight" 
                  />
                </div>
                <div className="w-64">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => { 
                      const nc = e.target.value; 
                      setSelectedCategory(nc); 
                      setSelectedArticle(prev => ({ ...prev, category: nc })); 
                    }} 
                    className="w-full px-4 py-2 text-sm font-bold border border-slate-200 rounded-xl bg-white shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-400 font-mono italic leading-none">ID: {selectedArticle.id}</p>
                  <div className="flex gap-4 mt-2">
                    {selectedArticle.lastSyncedAt && <p className="text-[9px] text-blue-600 font-black uppercase tracking-tight">Cloud Sync: {selectedArticle.lastSyncedAt}</p>}
                    {selectedArticle.lastModified && <p className="text-[9px] text-emerald-600 font-black uppercase tracking-tight">Local Draft: {selectedArticle.lastModified}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={deleteArticle} className="px-6 py-2.5 text-sm font-bold text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">Delete</button>
                  <button onClick={saveLocally} disabled={isSaving} className="px-6 py-2.5 text-sm font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 shadow-sm active:scale-95 transition-all">Save Draft</button>
                  <button onClick={pushLive} disabled={isSaving} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md active:scale-95 transition-all">Push Live</button>
                </div>
              </div>
            </header>

            <div className="mb-4 flex justify-end">
              <button onClick={() => setSourceMode(!sourceMode)} className={`text-[10px] font-bold px-4 py-1.5 rounded-full border transition-all ${sourceMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                {sourceMode ? 'VISUAL EDITOR' : 'VIEW SOURCE CODE'}
              </button>
            </div>

            {/* Key prop ensures Editor re-initializes on selection change */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px]" key={selectedArticle.id}>
              {sourceMode ? (
                <textarea 
                  value={editedHtml} 
                  onChange={(e) => setEditedHtml(e.target.value)} 
                  className="w-full h-[600px] p-10 font-mono text-sm focus:outline-none bg-slate-50 leading-relaxed resize-none" 
                  spellCheck={false} 
                />
              ) : (
                <Editor content={editedHtml} onChange={setEditedHtml} />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
             <div className="w-20 h-20 border-2 border-slate-200 rounded-full flex items-center justify-center mb-6 text-3xl opacity-50 font-black">?</div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs text-center">Select an article to begin workspace session</p>
          </div>
        )}
      </main>
    </div>
  );
}