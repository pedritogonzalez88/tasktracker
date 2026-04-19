import React, { useState, useEffect } from 'react';
import { Search, Plus, Bell, Settings, Share2, Trash2, X, Tag, Calendar as CalendarIcon, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { NOTE_COLORS } from '../constants';
import { useNavigate } from 'react-router-dom';

interface Note {
  id: string;
  title: string;
  content: string;
  labels: string[];
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export default function Notes() {
  const { user, userProfile } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    const q = query(collection(db, 'notes'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Note);
      setNotes(notesData.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
    });
    return unsubscribe;
  }, [user]);

  const handleCreateNote = async () => {
    if (!user) return;
    
    const tier = userProfile?.tier || 'free';
    const limits = { free: 20, plus: 40, pro: 200 };
    if (notes.length >= limits[tier]) {
      if (window.confirm(`${t('limit_reached')}\n${t('limit_notes_desc')}\n\n${t('upgrade_prompt')}`)) {
        navigate('/profile?checkout=true');
      }
      return;
    }
    
    // Auto-generate firestore ID
    const newNoteRef = doc(collection(db, 'notes'));
    const newDocId = newNoteRef.id;
    
    try {
      await setDoc(newNoteRef, {
        title: 'New Note',
        content: '',
        labels: ['General'],
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newMockNote: Note = {
        id: newDocId,
        title: 'New Note',
        content: '',
        labels: ['General'],
        ownerId: user.uid,
        createdAt: null,
        updatedAt: null
      };
      
      openNote(newMockNote);
    } catch (e) {
      console.error(e);
      alert('Failed to create note');
    }
  };

  const openNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setEditLabels(note.labels || []);
  };

  const handleSaveNote = async () => {
    if (!selectedNote || !user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'notes', selectedNote.id), {
        title: editTitle || 'Untitled Note',
        content: editContent,
        labels: editLabels,
        updatedAt: serverTimestamp()
      });
      setSelectedNote(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    setNoteToDelete(selectedNote.id);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteDoc(doc(db, 'notes', noteToDelete));
      if (selectedNote?.id === noteToDelete) setSelectedNote(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete note');
    } finally {
      setNoteToDelete(null);
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full w-full relative bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 transition-colors">
        {/* Header */}
        <header className="h-[64px] flex items-center justify-between px-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shrink-0 transition-colors">
          <div className="flex items-center gap-6 flex-1">
            <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">Quick Notes</h2>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 dark:focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200 shadow-sm" 
              />
            </div>
            <button onClick={handleCreateNote} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
              <Plus size={16} /> New Note
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 ml-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
               )}
            </div>
          </div>
        </header>

        {/* Masonry Grid Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('no_notes')}</p>
                <p className="text-sm">{t('no_notes_desc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {filteredNotes.map((note, index) => {
                 const isSelected = selectedNote?.id === note.id;
                 
                 // Mapping light generic NOTE_COLORS classes to dark mode equivalent inline, 
                 // since NOTE_COLORS are defined as constants.
                 const colorClass = NOTE_COLORS[index % NOTE_COLORS.length];
                 // A simple way to handle background color in dark mode given current setup
                 // is to use `dark:bg-slate-800` universally with colored borders, or inject it cleanly:
                 const darkColorOverride = 'dark:bg-slate-800 dark:border-slate-700';

                 let previewText = note.content || '';
                 if (previewText.length > 150) previewText = previewText.substring(0, 150) + '...';

                  const handleDeleteInline = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setNoteToDelete(note.id);
                  };

                 return (
                  <div 
                    key={note.id}
                    onClick={() => openNote(note)}
                    className={`group p-5 rounded-xl ${colorClass} ${darkColorOverride} border cursor-pointer hover:shadow-md transition-all flex flex-col gap-4 relative ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                  >
                    <button 
                      onClick={handleDeleteInline}
                      className="absolute top-3 right-3 p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Note"
                    >
                      <Trash2 size={14} />
                    </button>

                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[14px] leading-tight break-words pr-6">{note.title}</h3>
                    
                    {previewText && (
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed opacity-90 whitespace-pre-wrap break-words">
                        {previewText.split('\n').slice(0, 4).join('\n')}
                      </p>
                    )}

                    <div className="mt-2 flex gap-2 flex-wrap items-center">
                      {note.labels?.map((label, idx) => (
                        <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 uppercase tracking-wide border border-black/5 dark:border-white/10">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                 )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Editing Panel */}
      {selectedNote && (
        <aside className="w-[440px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 shadow-sm transition-all duration-300 transform translate-x-0 absolute right-0 top-0 bottom-0 md:relative">
          <div className="h-[64px] flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('editing_note')}</span>
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <button onClick={handleDeleteNote} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors" title="Delete Note"><Trash2 size={16} /></button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-2"></div>
              <button onClick={() => setSelectedNote(null)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors" title="Close Panel"><X size={18} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex flex-col max-w-[440px]">
            <div className="mb-6">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('title')}</label>
              <input 
                type="text" 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder={t('note_title_placeholder')}
                className="w-full text-[1.5rem] font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-600 outline-none"
              />
            </div>

            <div className="flex gap-4 mb-8 flex-wrap">
              {editLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold group transition-colors">
                  <Tag size={12} /> {label}
                  <button 
                    onClick={() => setEditLabels(editLabels.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center">
                 <input 
                   type="text" 
                   placeholder={t('add_tag')}
                   className="text-[11px] font-bold outline-none bg-transparent placeholder-slate-400 dark:placeholder-slate-500 dark:text-slate-200 w-24"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && e.currentTarget.value) {
                       if (!editLabels.includes(e.currentTarget.value) && editLabels.length < 5) {
                         setEditLabels([...editLabels, e.currentTarget.value]);
                       }
                       e.currentTarget.value = '';
                     }
                   }}
                 />
              </div>
            </div>

            <div className="mb-8 flex-1 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2.5 block">{t('content')}</label>
              <textarea 
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder={t('start_typing')}
                className="w-full flex-1 resize-none bg-transparent border-none p-0 text-slate-700 dark:text-slate-300 text-[14px] leading-relaxed focus:ring-0 outline-none min-h-[300px]"
              />
            </div>

            {selectedNote.updatedAt && (
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 text-center mb-0">
                {t('last_updated')} {formatDistanceToNow(selectedNote.updatedAt.toDate ? selectedNote.updatedAt.toDate() : new Date())} {t('ago')}
              </p>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors">
            <button 
              onClick={handleSaveNote}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-[6px] transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSaving ? t('saving') : t('save_changes')}
            </button>
          </div>
        </aside>
      )}

      {/* Custom Confirm Delete Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setNoteToDelete(null)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm relative z-10 p-6 flex flex-col transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[1.1rem] mb-2">{t('delete_note_prompt')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('delete_note_desc')}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-[6px] transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-[6px] shadow-sm transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
