
import React from 'react';
import { loginWithGoogle } from '../firebase';
import { Language, translations } from '../translations';
import LanguageSelector from './LanguageSelector';

interface LoginProps {
  lang: Language;
  setLang: (lang: Language) => void;
}

const Login: React.FC<LoginProps> = ({ lang, setLang }) => {
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir={(lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr'}>
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <LanguageSelector currentLang={lang} onSelect={setLang} />
        </div>

        <div className="mb-8 flex justify-center text-center items-center flex-col">
          <svg width="140" height="50" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm mb-4">
            <path d="M40 50L70 10L100 50H40Z" fill="#71717A" fillOpacity="0.8"/>
            <path d="M75 50L105 15L135 50H75Z" fill="#A1A1AA" fillOpacity="0.6"/>
            <path d="M10 50L40 20L70 50H10Z" fill="#3F3F46" fillOpacity="0.9"/>
            <text x="0" y="70" fontFamily="Heebo" fontWeight="800" fontSize="22" fill="#18181B">ארזי הנגב</text>
            <text x="0" y="82" fontFamily="Heebo" fontWeight="500" fontSize="8" fill="#52525B">ייזום ובניה בע"מ</text>
          </svg>
        </div>
        
        <h1 className="text-2xl font-black text-blue-900 mb-2">{t.appName}</h1>
        <p className="text-sm text-gray-500 mb-8 uppercase tracking-widest font-bold">{t.appSubName}</p>
        
        <button 
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 py-4 rounded-2xl font-black text-gray-700 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          {lang === 'he' ? 'התחברות עם גוגל' : lang === 'ru' ? 'Войти через Google' : 'تسجيل الدخول باستخدام جوجل'}
        </button>
        
        <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          {t.footerInfo}
        </p>
      </div>
    </div>
  );
};

export default Login;
