import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, Folder, MoreVertical, CheckCircle2, Clock, X, Trash2, Edit2, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { THEME_COLORS, PROJECT_STATUSES } from '../constants';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  color: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export default function Projects() {
  const { user, userProfile } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Active',
    color: 'bg-blue-500'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
      setProjects(projData.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
    });
    return unsubscribe;
  }, [user]);

  const openNewModal = () => {
    const tier = userProfile?.tier || 'free';
    const limits = { free: 1, plus: 2, pro: 10 };
    if (projects.length >= limits[tier]) {
      if (window.confirm(`${t('limit_reached')}\n${t('limit_projects_desc')}\n\n${t('upgrade_prompt')}`)) {
        navigate('/profile?checkout=true');
      }
      return;
    }
    setEditingProject(null);
    setFormData({ title: '', description: '', status: PROJECT_STATUSES[0], color: THEME_COLORS[0].bg });
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormData({
      title: proj.title || '',
      description: proj.description || '',
      status: proj.status || PROJECT_STATUSES[0],
      color: proj.color || THEME_COLORS[0].bg
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    try {
      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), {
          title: formData.title || 'Untitled Project',
          description: formData.description || '',
          status: formData.status || PROJECT_STATUSES[0],
          color: formData.color || THEME_COLORS[0].bg,
          updatedAt: serverTimestamp()
        });
      } else {
        const newRef = doc(collection(db, 'projects'));
        await setDoc(newRef, {
          title: formData.title || 'Untitled Project',
          description: formData.description || '',
          status: formData.status || PROJECT_STATUSES[0],
          color: formData.color || THEME_COLORS[0].bg,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Firebase Error:', error);
      alert('Failed to save project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
    } catch (error: any) {
      console.error(error);
      alert('Failed to delete project: ' + error.message);
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const descMatch = (p.description || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return titleMatch || descMatch;
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors">
      {/* Header */}
      <header className="h-[64px] flex items-center justify-between px-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shrink-0 transition-colors">
        <div className="flex items-center gap-6 flex-1">
          <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Folder className="text-blue-600 dark:text-blue-500" size={24} /> 
            {t('projects')}
          </h2>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={t('search_projects')} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 dark:focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200 shadow-sm" 
            />
          </div>
          <button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} /> {t('new_project')}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <Folder size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('no_projects')}</p>
            <p className="text-sm">{t('no_projects_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(project => {
              const bgClass = project.color || 'bg-blue-500';
              
              let statusBorder = 'border-blue-200 dark:border-blue-800/50';
              let statusBg = 'bg-blue-50 dark:bg-blue-900/30';
              let statusText = 'text-blue-700 dark:text-blue-400';
              let StatusIcon = PlayCircle;

              if (project.status === 'Completed') {
                statusBorder = 'border-emerald-200 dark:border-emerald-800/50';
                statusBg = 'bg-emerald-50 dark:bg-emerald-900/30';
                statusText = 'text-emerald-700 dark:text-emerald-400';
                StatusIcon = CheckCircle2;
              } else if (project.status === 'On Hold') {
                statusBorder = 'border-orange-200 dark:border-orange-800/50';
                statusBg = 'bg-orange-50 dark:bg-orange-900/30';
                statusText = 'text-orange-700 dark:text-orange-400';
                StatusIcon = Clock;
              }

              return (
                <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all flex flex-col group">
                  <div className={`h-2 w-full ${bgClass}`}></div>
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[16px] leading-tight flex-1">{project.title}</h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(project)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setProjectToDelete(project.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 flex-1 line-clamp-3">
                      {project.description || t('no_description')}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusBg} ${statusBorder} ${statusText} tracking-wide uppercase`}>
                        <StatusIcon size={12} /> {project.status}
                      </div>

                      {project.updatedAt && (
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                           {formatDistanceToNow(project.updatedAt.toDate ? project.updatedAt.toDate() : new Date())}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md relative z-10 flex flex-col transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[1.1rem]">
                {editingProject ? t('edit_project') : t('create_project')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSaving}
                className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('project_title')}</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder={t('title_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('description')}</label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder={t('desc_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('status')}</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                  >
                    {PROJECT_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('theme_color')}</label>
                  <div className="flex items-center gap-2 mt-2">
                    {THEME_COLORS.map(color => (
                       <button
                         key={color.bg}
                         type="button"
                         onClick={() => setFormData({...formData, color: color.bg})}
                         className={`w-6 h-6 rounded-full ${color.bg} transition-all border-2 ${formData.color === color.bg ? 'border-slate-800 dark:border-slate-100 scale-110' : 'border-transparent hover:scale-110'}`}
                         title={color.name}
                       />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                 <button 
                   type="button"
                   onClick={() => setIsModalOpen(false)}
                   disabled={isSaving}
                   className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-[6px] transition-colors disabled:opacity-50"
                 >
                   {t('cancel')}
                 </button>
                 <button 
                   type="submit"
                   disabled={isSaving}
                   className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-[6px] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                 >
                   {isSaving ? t('saving') : (editingProject ? t('update_btn') : t('create_btn'))}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setProjectToDelete(null)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm relative z-10 p-6 flex flex-col transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[1.1rem] mb-2">{t('delete_prompt')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('delete_project_desc')}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setProjectToDelete(null)}
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
