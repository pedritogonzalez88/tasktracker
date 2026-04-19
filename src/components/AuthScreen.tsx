import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { CheckCircle2, Mail, Lock, User as UserIcon, Phone, MapPin, AlertCircle } from 'lucide-react';

export default function AuthScreen() {
  const { signInWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const { t } = useSettings();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerWithEmail(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          phone: formData.phone
        });
      } else {
        await loginWithEmail(formData.email, formData.password);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
       setError('Google Sign-In failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">TaskTracker</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{t('manage_time')}</p>

        {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 text-left">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                 <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   required
                   type="text" 
                   placeholder={t('first_name')}
                   value={formData.firstName}
                   onChange={e => setFormData({...formData, firstName: e.target.value})}
                   className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                 />
              </div>
              <div className="relative">
                 <input 
                   required
                   type="text" 
                   placeholder={t('last_name')}
                   value={formData.lastName}
                   onChange={e => setFormData({...formData, lastName: e.target.value})}
                   className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                 />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              required
              type="email" 
              placeholder={t('email')}
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              required
              type="password" 
              placeholder={t('password')}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {isRegistering && (
            <>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={t('address')}
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="tel" 
                    placeholder={t('phone')}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '...' : (isRegistering ? t('sign_up') : t('sign_in'))}
          </button>
        </form>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
          <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider">{t('or_continue_with')}</span>
          <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm mb-6"
        >
          {t('sign_in_google')}
        </button>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isRegistering ? t('have_account') : t('no_account')}{' '}
          <button 
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
            }} 
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {isRegistering ? t('sign_in') : t('sign_up')}
          </button>
        </p>

      </div>
    </div>
  );
}
