import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Camera, User, Mail, Shield, Smartphone, Bell, ChevronRight, Key, Globe, Lock, X, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSearchParams } from 'react-router-dom';

export default function Profile() {
  const { user, userProfile } = useAuth();
  const { t } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dummy state for simulating profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    title: 'Senior Software Engineer',
    department: 'Product Development',
    location: t('detecting_location') || 'Detecting location...',
    timezone: 'UTC+00:00',
  });

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  useEffect(() => {
    const upgradeSuccess = searchParams.get('upgrade_success');
    const tierRaw = searchParams.get('tier');
    
    if (upgradeSuccess === 'true' && tierRaw && user && !isProcessingUpgrade && userProfile) {
      if (userProfile.tier === tierRaw) {
        // Once webhook updates firebase and our socket gets it, we clean up
        searchParams.delete('upgrade_success');
        searchParams.delete('tier');
        setSearchParams(searchParams);
        alert(`${t('tier_upgraded')} ${tierRaw.toUpperCase()}`);
        return;
      }
      
      // Still waiting for webhook to process
      setIsProcessingUpgrade(true);
      const timeout = setTimeout(() => {
        // Give webhook up to 5 seconds to process just as a UI loader
        setIsProcessingUpgrade(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [searchParams, user, userProfile, t, isProcessingUpgrade, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'true') {
      setIsBillingModalOpen(true);
      searchParams.delete('checkout');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleUpgrade = async (newTier: 'free' | 'plus' | 'pro') => {
    if (!user) return;
    setIsProcessingUpgrade(true);
    try {
      if (newTier === 'free') {
        await updateDoc(doc(db, 'users', user.uid), {
          tier: newTier
        });
        alert(`${t('tier_upgraded')} ${newTier.toUpperCase()}`);
        setIsBillingModalOpen(false);
      } else {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: newTier, uid: user.uid }),
        });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
          return; // Let the redirect happen
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error('No checkout URL returned. Please check console for details.');
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(`${t('error_tier')}: ${error.message}`);
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  useEffect(() => {
    // Auto-detect timezone offset for initial state
    const offsetMinutes = new Date().getTimezoneOffset();
    const offsetSign = offsetMinutes > 0 ? '-' : '+';
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60).toString().padStart(2, '0');
    const defaultTz = `UTC${offsetSign}${offsetHours}:00`;
    
    setFormData(prev => ({ ...prev, timezone: defaultTz }));

    const fetchLocation = async () => {
      try {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (response.ok) {
          const data = await response.json();
          if (data.city && data.country) {
            const regionStr = data.region ? `, ${data.region}` : '';
            setFormData(prev => ({
              ...prev,
              location: `${data.city}${regionStr}, ${data.country}`
            }));
          }
        } else {
          setFormData(prev => ({ ...prev, location: t('unknown_location') || 'Unknown Location' }));
        }
      } catch (error) {
        console.error('Failed to fetch IP location:', error);
        setFormData(prev => ({ 
          ...prev, 
          location: prev.location === t('detecting_location') ? (t('unknown_location') || 'Unknown Location') : prev.location 
        }));
      }
    };

    fetchLocation();
  }, [t]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full transition-colors">
      <header className="flex items-center justify-between px-8 h-[64px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shrink-0 transition-colors">
        <h2 className="text-[1.5rem] font-bold text-slate-800 dark:text-slate-100">{t('my_profile')}</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded-[6px] text-sm font-semibold shadow-sm transition-colors"
          >
            {isEditing ? t('save_changes') : t('edit_profile')}
          </button>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Main Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="h-32 bg-slate-900 w-full relative">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-transparent"></div>
          </div>
          
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-xl border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-sm relative z-10 transition-colors">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                      <User size={48} />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} />
                  </button>
                )}
              </div>
              
              <div className="flex-1 pb-2">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="text-[2rem] font-bold text-slate-900 dark:text-slate-100 border-b border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-400 outline-none bg-transparent mb-1 w-full max-w-md transition-colors"
                  />
                ) : (
                  <h1 className="text-[2rem] font-bold text-slate-900 dark:text-slate-100 leading-none mb-2 transition-colors">{formData.name || t('anonymous_user')}</h1>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[13px] text-slate-500 dark:text-slate-400 font-medium transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Mail size={16} className="text-slate-400 dark:text-slate-500" />
                    <span>{user?.email || 'N/A'}</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                  <div className="flex items-center gap-1.5">
                    <Shield size={16} className="text-slate-400 dark:text-slate-500" />
                    <span>{t('google_authenticated')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700 transition-colors">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">{t('job_title')}</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-[14px] text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <p className="text-[14px] font-medium text-slate-800 dark:text-slate-300 transition-colors">{formData.title}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">{t('department')}</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-[14px] text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <p className="text-[14px] font-medium text-slate-800 dark:text-slate-300 transition-colors">{formData.department}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">{t('location')}</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-[14px] text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <p className="text-[14px] font-medium text-slate-800 dark:text-slate-300 transition-colors">{formData.location}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">{t('timezone')}</label>
                {isEditing ? (
                  <select 
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] text-[14px] text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-500 transition-colors">
                    {[...Array(27)].map((_, i) => {
                      const offset = i - 12;
                      const sign = offset >= 0 ? '+' : '-';
                      const absOffset = Math.abs(offset).toString().padStart(2, '0');
                      const label = `UTC${sign}${absOffset}:00`;
                      return <option key={label} value={label}>{label}</option>
                    })}
                  </select>
                ) : (
                  <p className="text-[14px] font-medium text-slate-800 dark:text-slate-300 transition-colors">{formData.timezone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-colors">
              <h3 className="text-[1.2rem] font-bold text-slate-800 dark:text-slate-100 mb-4 transition-colors">{t('account_prefs')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors">
                      <Bell size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 transition-colors">{t('notifications')}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 transition-colors">{t('notifications_desc')}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 dark:text-slate-500" />
                </div>
                
                <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
                      <Lock size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 transition-colors">{t('privacy_security')}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 transition-colors">{t('privacy_desc')}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 dark:text-slate-500" />
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-colors">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 transition-colors">{t('lang_region')}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 transition-colors">{t('lang_desc')}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>

          </div>

          {/* Side Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-colors">
              <h3 className="font-bold mb-4 uppercase tracking-widest text-slate-500 dark:text-slate-400 text-[10px]">{t('connected_accounts')}</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800/50 flex items-center justify-center transition-colors">
                   <Mail size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 transition-colors">Google</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 transition-colors">{t('primary_auth')}</p>
                </div>
                <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded transition-colors">{t('active')}</span>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative">
               <h3 className="text-[14px] font-bold mb-2 relative z-10 capitalize">{userProfile?.tier || 'Free'} Tier</h3>
               <p className="text-[11px] text-slate-400 mb-4 relative z-10 leading-relaxed">
                 {userProfile?.tier === 'pro' ? t('pro_desc') : `You are on the ${userProfile?.tier || 'free'} tier. Upgrade to unlock more limits.`}
               </p>
               <button 
                 onClick={() => setIsBillingModalOpen(true)}
                 className="w-full py-2 bg-white/10 hover:bg-white/20 transition-colors text-[13px] font-bold rounded-[6px] relative z-10 border border-white/10"
               >
                 {t('manage_billing')}
               </button>
               <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

      </div>

      {/* Billing Modal */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={() => setIsBillingModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden transition-colors">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('manage_billing')}</h2>
              <button onClick={() => setIsBillingModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'free', name: t('plan_free'), price: t('price_free'), limits: t('limits_free'), features: [t('feat_core_task'), t('feat_basic_rep')] },
                { id: 'plus', name: t('plan_plus'), price: t('price_plus'), limits: t('limits_plus'), features: [t('feat_all_free'), t('feat_enh_prio'), t('feat_prio_supp')] },
                { id: 'pro', name: t('plan_pro'), price: t('price_pro'), limits: t('limits_pro'), features: [t('feat_all_plus'), t('feat_ai_work'), t('feat_ded_mgr')] }
              ].map((tPlan) => {
                const currentTier = userProfile?.tier || 'free';
                const isCurrent = currentTier === tPlan.id;
                
                return (
                  <div key={tPlan.id} className={`border rounded-xl p-6 flex flex-col transition-colors ${isCurrent ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{tPlan.name}</h3>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{tPlan.price}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">{tPlan.limits}</p>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                      {tPlan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button 
                      onClick={() => handleUpgrade(tPlan.id as any)}
                      disabled={isCurrent || isProcessingUpgrade}
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                       isCurrent 
                         ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                         : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                       {isCurrent ? t('current_plan') : (isProcessingUpgrade ? t('processing') : t('select_plan'))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
