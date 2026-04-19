import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../lib/i18n';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: string;
  setTheme: (theme: string) => void;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'System';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    if (theme === 'Dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'Light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const t = (key: string) => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
