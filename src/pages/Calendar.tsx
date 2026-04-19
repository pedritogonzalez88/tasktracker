import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Edit2, AlertCircle, X, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';

export default function Calendar() {
  const { googleAccessToken, signInWithGoogle, userProfile } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [authError, setAuthError] = useState(false);

  // New Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    description: ''
  });

  const handleAddCalendar = () => {
    const tier = userProfile?.tier || 'free';
    const numCalendarsSyncing = googleAccessToken ? 1 : 0; // Simulated connected calendars
    const limits = { free: 1, plus: 2, pro: 10 };
    
    if (numCalendarsSyncing >= limits[tier]) {
      if (window.confirm(`${t('limit_reached')}\n${t('limit_calendar_desc')}\n\n${t('upgrade_prompt')}`)) {
         navigate('/profile?checkout=true');
      }
      return;
    }
    
    signInWithGoogle();
  };
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  useEffect(() => {
    if (!googleAccessToken) {
      setCalendarEvents([]);
      return;
    }

    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setAuthError(false);
      try {
        const timeMin = startOfMonth(currentMonth).toISOString();
        const timeMax = endOfMonth(currentMonth).toISOString();
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
          }
        );
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setAuthError(true);
            return;
          }
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        setCalendarEvents(data.items || []);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [currentMonth, googleAccessToken]);

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
  };

  const openNewEventModal = (defaultDate?: Date) => {
    const d = defaultDate || selectedDate || new Date();
    setNewEvent({
      title: '',
      date: format(d, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAccessToken) {
      alert("Please connect Google Calendar first.");
      return;
    }
    
    setIsCreating(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startDateTime = `${newEvent.date}T${newEvent.startTime}:00`;
      const endDateTime = `${newEvent.date}T${newEvent.endTime}:00`;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: newEvent.title || 'New Event',
            description: newEvent.description,
            start: { dateTime: startDateTime, timeZone: tz },
            end: { dateTime: endDateTime, timeZone: tz }
          })
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setAuthError(true);
        throw new Error('Failed to create event');
      }

      const createdEvent = await response.json();
      setCalendarEvents(prev => [...prev, createdEvent].sort((a,b) => {
         const tA = a.start?.dateTime || a.start?.date || '';
         const tB = b.start?.dateTime || b.start?.date || '';
         return tA.localeCompare(tB);
      }));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save event. Ensure calendar permissions are granted.");
    } finally {
      setIsCreating(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const dayEvents = calendarEvents.filter(e => {
         const eventDate = e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date + 'T00:00:00') : null);
         if (!eventDate) return false;
         return isSameDay(eventDate, cloneDay);
      });

      const todayClass = isSameDay(day, new Date()) ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800' : '';
      const selectedClass = isSameDay(day, selectedDate) && !isSameDay(day, new Date()) ? 'bg-slate-100 ring-1 ring-inset ring-slate-300 dark:bg-slate-700/50 dark:ring-slate-600' : '';
      const notSameMonthClass = !isSameMonth(day, monthStart) ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200';
      
      days.push(
        <div 
          key={day.toString()} 
          onClick={() => onDateClick(cloneDay)}
          onDoubleClick={() => openNewEventModal(cloneDay)}
          className={`border-b border-r border-slate-200 dark:border-slate-700 p-2 min-h-[120px] relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex flex-col ${notSameMonthClass} ${todayClass} ${selectedClass}`}
        >
          <span className={`text-[13px] font-medium ${isSameDay(day, new Date()) ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            {formattedDate}
          </span>
          <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar flex-1">
            {dayEvents.slice(0, 4).map(event => (
              <div key={event.id} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-1 rounded text-[9px] font-semibold truncate border border-blue-100 dark:border-blue-800/50" title={event.summary}>
                {event.start?.dateTime ? format(new Date(event.start.dateTime), 'H:mm') + ' ' : ''}
                {event.summary || 'Busy'}
              </div>
            ))}
            {dayEvents.length > 4 && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-1">+{dayEvents.length - 4} more</div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
  }

  const selectedDayEvents = calendarEvents.filter(e => {
      const eventDate = e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date + 'T00:00:00') : null);
      if (!eventDate) return false;
      return isSameDay(eventDate, selectedDate);
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 relative transition-colors">
      <header className="flex items-center justify-between px-6 h-[64px] border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 transition-colors">
        <div className="flex items-center gap-6">
          <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
            <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors text-slate-500 dark:text-slate-400">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('today')}</button>
            <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors text-slate-500 dark:text-slate-400">
              <ChevronRight size={16} />
            </button>
          </div>
          {isLoadingEvents && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">{t('syncing')}</span>}
        </div>
        <div className="flex items-center gap-4">
          {!googleAccessToken && (
             <button onClick={handleAddCalendar} className="text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800/50 transition-colors flex items-center gap-2">
                <CalendarIcon size={14} /> {t('connect_gcal')}
             </button>
          )}
          <button onClick={() => openNewEventModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} /> {t('new_event')}
          </button>
        </div>
      </header>

      {authError && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/50 px-6 py-3 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm shadow-sm shrink-0 flex-none z-10 w-full relative transition-colors">
          <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 shrink-0"/>
          <p>{t('access_expired')} <button onClick={handleAddCalendar} className="font-bold underline text-amber-900 dark:text-amber-100">{t('reconnect')}</button> {t('to_enable')}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Calendar Grid Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 transition-colors overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 transition-colors">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
              <div key={dayName} className="py-2.5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {dayName}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-white dark:bg-slate-800 transition-colors">
            {/* Needs dynamic cell classes updated... I need to handle that inside the loop above. */}
            {days}
          </div>
        </div>

        {/* Right Sidebar - Day Details */}
        <aside className="w-80 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 flex flex-col overflow-y-auto shrink-0 z-0 transition-colors">
          <h3 className="text-[1.2rem] font-bold text-slate-800 dark:text-slate-100 mb-4">{t('day_details')}</h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{format(selectedDate, 'EEEE, MMM d')}</span>
            </div>
            
            <div className="space-y-4">
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium py-4 text-center">{t('no_events_scheduled')}</p>
              ) : (
                selectedDayEvents.map((event, idx) => {
                   const isPast = event.end?.dateTime ? new Date(event.end.dateTime) < new Date() : false;
                   const colorClass = idx % 3 === 0 ? 'bg-amber-500' : idx % 3 === 1 ? 'bg-emerald-500' : 'bg-blue-600 dark:bg-blue-500';
                   return (
                     <div key={event.id} className={`flex gap-3 ${isPast ? 'opacity-50' : ''}`}>
                       <div className={`w-1 ${colorClass} rounded-full shrink-0`}></div>
                       <div className="flex-1 min-w-0">
                         <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{event.summary || t('busy')}</p>
                         <p className="text-[11px] text-slate-500 dark:text-slate-400">
                           {event.start?.dateTime 
                             ? `${format(new Date(event.start.dateTime), 'h:mm a')} - ${format(new Date(event.end.dateTime), 'h:mm a')}`
                             : t('all_day')}
                         </p>
                       </div>
                     </div>
                   );
                })
              )}
            </div>

            <button onClick={() => openNewEventModal(selectedDate)} className="w-full mt-6 py-2 border border-slate-200 dark:border-slate-700 border-dashed rounded-[6px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-semibold flex items-center justify-center gap-2">
              <Plus size={14} /> {t('add_new')}
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[1.2rem] font-bold text-slate-800 dark:text-slate-100">{t('upcoming')}</h3>
          </div>

          <div className="space-y-3 mb-8">
             {calendarEvents
               .filter(e => {
                  const evDate = e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date + 'T00:00:00') : new Date(0));
                  return evDate >= new Date();
               })
               .slice(0, 3)
               .map(event => {
                  const evDate = event.start?.dateTime ? new Date(event.start.dateTime) : (event.start?.date ? new Date(event.start.date + 'T00:00:00') : new Date());
                  return (
                    <div key={'upcoming-' + event.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                      <div className="w-11 h-11 bg-slate-50 dark:bg-slate-900 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        <span className="text-[9px] font-bold uppercase leading-none mb-0.5">{format(evDate, 'MMM')}</span>
                        <span className="text-[14px] font-bold leading-none text-slate-800 dark:text-slate-200">{format(evDate, 'd')}</span>
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{event.summary || t('busy')}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                           {event.start?.dateTime ? format(new Date(event.start.dateTime), 'h:mm a') : t('all_day')}
                        </p>
                      </div>
                    </div>
                  );
               })
             }
             {calendarEvents.length === 0 && !googleAccessToken && (
                 <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('connect_gcal_prompt')}</p>
             )}
          </div>
        </aside>
      </div>

      {/* Event Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh] transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[1.1rem]">{t('create_new_event')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="overflow-y-auto p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('event_title')}</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder={t('event_title_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('date')}</label>
                <input 
                  required
                  type="date" 
                  value={newEvent.date}
                  onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('start_time')}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      required
                      type="time" 
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('end_time')}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      required
                      type="time" 
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{t('description')}</label>
                <textarea 
                  rows={3}
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder={t('desc_placeholder_event')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none shadow-sm"
                />
              </div>

              <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                 <button 
                   type="button"
                   onClick={() => setIsModalOpen(false)}
                   className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-[6px] transition-colors"
                 >
                   {t('cancel')}
                 </button>
                 <button 
                   type="submit"
                   disabled={isCreating}
                   className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-[6px] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                   {isCreating ? t('saving') : t('create_event')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
