import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Calendar as CalendarIcon, Download, Trash2, Monitor, Shield, Paintbrush, Globe } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Language } from '../lib/i18n';

export default function Settings() {
  const { googleAccessToken, signInWithGoogle, user } = useAuth();
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const exportData: any = {};
      
      const projectsQ = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
      exportData.projects = (await getDocs(projectsQ)).docs.map(d => d.data());

      const tasksQ = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
      exportData.tasks = (await getDocs(tasksQ)).docs.map(d => d.data());

      const notesQ = query(collection(db, 'notes'), where('ownerId', '==', user.uid));
      exportData.notes = (await getDocs(notesQ)).docs.map(d => d.data());

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasktracker-export-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Error exporting data: ' + err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm(t('delete_desc') + " Are you sure?")) {
       try {
         if (auth.currentUser) {
            await deleteUser(auth.currentUser);
            window.location.href = '/';
         }
       } catch (error: any) {
         if (error.code === 'auth/requires-recent-login') {
            alert('To delete your account, please log out, log back in, and try again for security reasons.');
         } else {
            console.error('Error deleting account:', error);
            alert('Failed to delete account.');
         }
       }
    }
  };
  
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full transition-colors">
      <header className="flex items-center justify-between px-8 h-[64px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shrink-0 transition-colors">
        <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">{t('settings')}</h2>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Appearance Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Paintbrush size={18} />
            </div>
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-slate-100">{t('appearance')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{t('theme_preference')}</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('theme_desc')}</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                {['Light', 'Dark', 'System'].map((tOpt) => (
                  <button 
                    key={tOpt}
                    onClick={() => setTheme(tOpt)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${theme === tOpt ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {tOpt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <Globe size={18} className="text-slate-400 dark:text-slate-500" />
                 <div>
                   <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{t('language')}</p>
                   <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('language_desc')}</p>
                 </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'es', label: 'Español' }
                ].map((lang) => (
                  <button 
                    key={lang.id}
                    onClick={() => setLanguage(lang.id as Language)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${language === lang.id ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Monitor size={18} />
            </div>
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-slate-100">{t('integrations')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Google Calendar</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 max-w-sm mb-2">Sync your scheduled tasks and meetings directly from your primary Google Calendar.</p>
                  {googleAccessToken ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
              <div>
                {!googleAccessToken ? (
                   <button 
                     onClick={signInWithGoogle}
                     className="bg-blue-50 dark:bg-blue-600 text-blue-700 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 border border-blue-200 dark:border-blue-500 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors w-full sm:w-auto"
                   >
                     Connect Account
                   </button>
                ) : (
                   <button 
                     onClick={() => alert("Calendar connection is active. To disconnect, log out and revoke from Google Account permissions.")}
                     className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors w-full sm:w-auto"
                   >
                     Manage Connection
                   </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-slate-100">{t('data_privacy')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{t('export_data')}</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('export_desc')}</p>
              </div>
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
               >
                <Download size={16} /> {isExporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold text-red-600 dark:text-red-400">{t('delete_account')}</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('delete_desc')}</p>
              </div>
              <button 
                onClick={handleDeleteAccount}
                className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors"
               >
                <Trash2 size={16} /> {t('delete_account')}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
