import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, Calendar as CalendarIcon, CheckCircle2, Folder, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subDays, isSameDay } from 'date-fns';

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useSettings();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Data
    const tasksQ = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const projectsQ = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const notesQ = query(collection(db, 'notes'), where('ownerId', '==', user.uid));
    const unsubNotes = onSnapshot(notesQ, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubNotes();
    };
  }, [user]);

  // Derived Statistics
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  
  // Last 7 days task completed data chart
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      // Let's count tasks created or updated on that day (simulate completion day as updatedAt if status is completed)
      const tCount = tasks.filter(t => {
         if (!t.updatedAt) return false;
         const tDate = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt);
         return isSameDay(tDate, d) && t.status === 'Completed';
      }).length;
      
      days.push({ day: format(d, 'EEE'), tasks: tCount });
    }
    return days;
  }, [tasks]);

  const pieData = useMemo(() => {
    // Let's group projects by status
    const result = [
      { name: 'Active', value: projects.filter(p => p.status === 'Active').length || 0, color: '#2563eb' },
      { name: 'On Hold', value: projects.filter(p => p.status === 'On Hold').length || 0, color: '#f59e0b' },
      { name: 'Completed', value: projects.filter(p => p.status === 'Completed').length || 0, color: '#10b981' }
    ];
    return result;
  }, [projects]);

  const productivityScore = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="flex items-center justify-between px-8 h-[64px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shrink-0 transition-colors">
        <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">{t('performance_analytics')}</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={t('search_data')} 
              className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-sm w-[300px] transition-all outline-none text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800" 
            />
          </div>
          <button className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
            <Bell size={20} />
          </button>
          <button className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
            <CalendarIcon size={20} />
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: t('total_tasks'), value: tasks.length || '0', change: tasks.length > 0 ? '+ ' + t('active') : t('new'), isUp: true, icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('completed'), value: completedTasks || '0', change: productivityScore + '% ' + t('rate'), isUp: productivityScore > 50, icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: t('total_projects'), value: projects.length || '0', change: projects.filter(p=>p.status === 'Active').length + ' ' + t('active'), isUp: true, icon: Folder, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
            { label: t('total_notes'), value: notes.length || '0', change: t('library'), isUp: null, icon: FileText, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-3 border-none">
                <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[2rem] font-bold font-mono text-slate-800 dark:text-slate-100 tracking-tight">{stat.value}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stat.isUp === true ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : stat.isUp === false ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-red-100 dark:border-red-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('weekly_task_completion')}</h3>
              <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-xs font-semibold py-1.5 px-3 outline-none text-slate-600 dark:text-slate-300">
                <option>{t('last_7_days')}</option>
                <option>{t('last_30_days')}</option>
              </select>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <Bar dataKey="tasks" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-none">
              {weeklyData.map(d => (
                 <span key={d.day} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex-1 text-center">{d.day}</span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center relative transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 absolute top-5 left-5">{t('productivity_score')}</h3>
            <div className="relative w-48 h-48 flex items-center justify-center mt-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100 dark:text-slate-700" />
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray="502" strokeDashoffset={502 - (502 * productivityScore) / 100} className="text-blue-600 dark:text-blue-500" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[2.5rem] font-bold font-mono text-slate-800 dark:text-slate-100 tracking-tight leading-none">{productivityScore}%</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider mt-1">{productivityScore > 50 ? t('optimal') : t('needs_focus')}</span>
              </div>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center mt-6">
              {t('completion_message').replace('{completed}', completedTasks.toString()).replace('{total}', tasks.length.toString())}
            </p>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('activity_heatmap')}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  <span>{t('less')}</span>
                  <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-700"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-300 dark:bg-blue-800/60"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-600"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-700 dark:bg-blue-400"></div>
                  <span>{t('more')}</span>
                </div>
             </div>
             <div className="grid grid-cols-12 gap-1.5 flex-1">
               {Array.from({length: 48}).map((_, i) => {
                  const intensity = Math.random();
                  const bgClass = intensity > 0.8 ? 'bg-blue-600 dark:bg-blue-400' : intensity > 0.5 ? 'bg-blue-400 dark:bg-blue-600' : intensity > 0.2 ? 'bg-blue-200 dark:bg-blue-800/60' : 'bg-slate-100 dark:bg-slate-700';
                  return <div key={i} className={`aspect-square ${bgClass} rounded-sm transition-colors`} />
               })}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
             <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">{t('project_status_distribution')}</h3>
             <div className="flex items-center gap-8 h-[180px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center space-y-4">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between border-none">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-[14px] font-bold font-mono text-slate-800 dark:text-slate-200">{d.value}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
