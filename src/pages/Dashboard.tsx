import React, { useState, useEffect } from 'react';
import { Search, Plus, Clock, Tag, MoreVertical, Video, Coffee, Calendar as CalendarIcon, PlusCircle, CheckCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useSettings } from '../contexts/SettingsContext';
import { db } from '../lib/firebase';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, googleAccessToken, userProfile, signInWithGoogle } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(' ')[0] || 'User';

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Projects
    const projectsQ = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Tasks
    const tasksQ = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProjects();
      unsubTasks();
    };
  }, [user]);

  useEffect(() => {
    // Fetch today's meetings from Google Calendar
    if (!googleAccessToken) {
      setMeetings([]);
      return;
    }
    const fetchMeetings = async () => {
      try {
        const timeMin = startOfDay(new Date()).toISOString();
        const timeMax = endOfDay(new Date()).toISOString();
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${googleAccessToken}` } }
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out full-day events to get actual meetings
          const timedEvents = (data.items || []).filter((e: any) => e.start?.dateTime);
          setMeetings(timedEvents);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMeetings();
  }, [googleAccessToken]);

  const handleAddCalendar = () => {
    const tier = userProfile?.tier || 'free';
    const numCalendarsSyncing = googleAccessToken ? 1 : 0;
    const limits = { free: 1, plus: 2, pro: 10 };
    
    if (numCalendarsSyncing >= limits[tier]) {
      if (window.confirm(`${t('limit_reached')}\n${t('limit_calendar_desc')}\n\n${t('upgrade_prompt')}`)) {
         navigate('/profile?checkout=true');
      }
      return;
    }
    
    signInWithGoogle();
  };

  const activeProjects = projects.filter(p => p.status === 'Active');
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'High');

  // Let's find the primary ongoing project or task
  const priorityProject = activeProjects.length > 0 ? activeProjects[0] : null;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header section */}
      <header className="h-[64px] flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">{t('greeting').replace('{name}', firstName)}</h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400">{t('dashboard_subtitle')}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-[6px] text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 w-[300px] transition-colors">
            <Search size={16} /> <span className="truncate">{t('search_placeholder')}</span>
          </div>
          <button className="bg-blue-600 text-white px-5 py-2 rounded-[6px] text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus size={16} /> {t('add_new_task')}
          </button>
        </div>
      </header>

      {/* Top Cards Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Today's Focus Card */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 dark:bg-blue-900/20 rounded-bl-full"></div>
          <div className="relative flex-1 w-full">
            <p className="text-blue-600 dark:text-blue-400 font-bold text-[10px] mb-2 uppercase tracking-[1px]">{t('priority_project')}</p>
            <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">{priorityProject?.title || t('no_active_projects')}</h3>
            <div className="flex flex-wrap gap-4 mb-6">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Clock size={14} /> {t('ongoing')}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Tag size={14} /> {priorityProject?.status || t('none')}
              </span>
            </div>
            <button className="bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-4 py-1.5 rounded-full text-[11px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-transparent dark:border-blue-800/50">
              {t('view_details')}
            </button>
          </div>
          <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-700" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="301.5" strokeDashoffset={priorityProject ? "150" : "301.5"} className="text-blue-600 dark:text-blue-500" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight">{priorityProject ? '50%' : '0%'}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t('done')}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">{t('daily_goal')}</p>
          </div>
        </div>

        {/* Weekly Performance */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{t('weekly_performance')}</h3>
            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">+12%</span>
          </div>
          <p className="text-[2rem] font-bold font-mono mb-1 text-slate-800 dark:text-slate-100 tracking-tight mt-2">{completedTasks.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-auto">{t('tasks_completed_total')}</p>
          
          <div className="flex items-end justify-between h-24 gap-2 mt-6">
            {/* Simple simulated bar chart until sub-tasks feature is populated */}
            {[5, 10, 20, 15, 30, tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0, 5].map((height, i) => {
              const isToday = i === 3;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative">
                  <div className={`w-full rounded-t-sm transition-all duration-300 ${isToday ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`} style={{ height: `${height}%` }}></div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    {['M','T','W','T','F','S','S'][i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* High Priority */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-[14px]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              {t('high_priority')}
            </h4>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{highPriorityTasks.length}</span>
          </div>
          <div className="space-y-4">
            {highPriorityTasks.length === 0 ? (
               <p className="text-sm text-slate-500 dark:text-slate-400 py-4 px-2 border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-center">{t('no_high_priority')}</p>
            ) : (
               highPriorityTasks.slice(0,3).map(task => (
                 <div key={task.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors group cursor-pointer">
                   <div className="flex justify-between mb-3">
                     <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">{task.status}</span>
                     <MoreVertical size={16} className="text-slate-400 dark:text-slate-500" />
                   </div>
                   <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 leading-snug">{task.title}</p>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* Meetings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-[14px]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              {t('todays_meetings')}
            </h4>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{meetings.length}</span>
          </div>
          <div className="space-y-4">
            {!googleAccessToken ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30 text-center transition-colors">
                 <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">{t('no_calendar')}</p>
                 <button className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 px-3 py-1.5 rounded-md text-blue-700 dark:text-blue-400 shadow-sm" onClick={handleAddCalendar}>{t('go_connect')}</button>
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 px-2 border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-center">{t('no_meetings')}</p>
            ) : (
              meetings.slice(0,3).map(m => (
                <div key={m.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded text-blue-600 dark:text-blue-400">
                      <Video size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{m.summary || t('busy')}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">
                         {m.start?.dateTime ? format(new Date(m.start.dateTime), 'HH:mm') : ''} • {t('gcal')}
                      </p>
                      {m.htmlLink && <a href={m.htmlLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider">JOIN / VIEW →</a>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-[14px]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              {t('upcoming_tasks')}
            </h4>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{pendingTasks.length}</span>
          </div>
          <div className="space-y-4">
            {pendingTasks.slice(0, 2).map((tItem, i) => (
              <div key={tItem.id || i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex items-center gap-4 transition-colors">
                <CheckCircle2 size={18} className="text-slate-300 dark:text-slate-600" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{tItem.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{tItem.date ? format(new Date(tItem.date), 'MMM d, yyyy') : t('no_date')}</p>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 px-2 border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-center">{t('no_pending_tasks')}</p>
            )}
            <button className="w-full py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all font-semibold shadow-sm">
              <PlusCircle size={20} />
              <span className="text-[10px] tracking-[1px] uppercase">{t('add_new_task')}</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
