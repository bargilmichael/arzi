import React, { useState, useEffect, useMemo } from 'react';
import { ProjectState, TaskStatus, Unit, Discipline, Appointment } from './types';
import { initializeData, getUnit, updateUnit, updateBuilding } from './services/dataService';
import BuildingSelector from './components/BuildingSelector';
import BuildingCommittee from './components/BuildingCommittee';
import UnitGrid from './components/UnitGrid';
import UnitModal from './components/UnitModal';
import ContractorView from './components/ContractorView';
import ScheduleView from './components/ScheduleView';
import ProjectHistoryView from './components/ProjectHistoryView';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import LanguageSelector from './components/LanguageSelector';
import { auth, onAuthStateChanged, logout, FirebaseUser, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Language, translations } from './translations';
import { PUBLIC_AREAS, STATUS_CONFIG } from './constants';

const Logo = () => (
  <svg width="140" height="50" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
    <path d="M40 50L70 10L100 50H40Z" fill="#71717A" fillOpacity="0.8"/>
    <path d="M75 50L105 15L135 50H75Z" fill="#A1A1AA" fillOpacity="0.6"/>
    <path d="M10 50L40 20L70 50H10Z" fill="#3F3F46" fillOpacity="0.9"/>
    <text x="0" y="70" fontFamily="Heebo" fontWeight="800" fontSize="22" fill="#18181B">ארזי הנגב</text>
    <text x="0" y="82" fontFamily="Heebo" fontWeight="500" fontSize="8" fill="#52525B">ייזום ובניה בע"מ</text>
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'contractor' | 'viewer'>('viewer');
  const [userDiscipline, setUserDiscipline] = useState<string>('all');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<ProjectState>(() => initializeData());
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'units' | 'public' | 'contractors' | 'schedule' | 'history' | 'users'>('units');
  
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'he';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Check if there's a pre-added user by email
          const emailRef = doc(db, 'users', currentUser.email?.toLowerCase() || '');
          const emailSnap = await getDoc(emailRef);
          
          if (emailSnap.exists() && !emailSnap.data().uid) {
            // User was pre-added. Claim the document by moving it to UID-based ID.
            const preData = emailSnap.data();
            const finalRole = currentUser.email === 'bargil.michael@gmail.com' ? 'admin' : (preData.role || 'viewer');
            
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              role: finalRole,
              discipline: preData.discipline || 'all'
            });
            
            // Delete the temporary email-based document
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(emailRef);
            
            setUserRole(finalRole);
            setUserDiscipline(preData.discipline || 'all');
          } else {
            // Standard new user logic
            const defaultRole = currentUser.email === 'bargil.michael@gmail.com' ? 'admin' : 'viewer';
            const defaultDiscipline = 'all';
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              role: defaultRole,
              discipline: defaultDiscipline
            });
            setUserRole(defaultRole);
            setUserDiscipline(defaultDiscipline);
          }
        } else {
          const data = userSnap.data();
          // Force admin role for the primary account
          const role = currentUser.email === 'bargil.michael@gmail.com' ? 'admin' : data.role;
          setUserRole(role);
          setUserDiscipline(data.discipline || 'all');
        }
      }
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang];

  useEffect(() => {
    if (!selectedBuildingId && state.buildings.length > 0) {
      setSelectedBuildingId(state.buildings[0].id);
    }
  }, [state.buildings, selectedBuildingId]);

  const activeUnit = useMemo(() => {
    if (!selectedBuildingId || selectedUnitId === null) return null;
    return getUnit(state, selectedBuildingId, selectedUnitId);
  }, [state, selectedBuildingId, selectedUnitId]);

  // Fix: updated newLog parameter to include optional images field to match UnitModal's onSave requirement
  const handleUpdateUnit = (updates: { 
    newLog?: { status: TaskStatus, workerName: string, contractor: string, description: string, discipline: Discipline, images?: string[] },
    updateLogStatus?: { logId: string, newStatus: TaskStatus },
    newAppointment?: Omit<Appointment, 'id' | 'createdAt' | 'isCompleted'>,
    completeAppointmentId?: string,
    updateTenantInfo?: { name: string, phone: string }
  }) => {
    if (!activeUnit) return;
    const newState = updateUnit(state, activeUnit, {
      newLog: updates.newLog,
      updateLogStatus: updates.updateLogStatus,
      newAppointment: updates.newAppointment,
      completeAppointmentId: updates.completeAppointmentId,
      updateTenantInfo: updates.updateTenantInfo
    });
    setState(newState);
  };

  const filteredBuildings = state.buildings.filter(b => {
    const buildingName = lang === 'ru' ? b.name.replace('בניין', 'Здание') : b.name;
    return buildingName.includes(searchTerm) || b.id.includes(searchTerm) || b.name.includes(searchTerm);
  });

  const handleSelectFromOtherView = (buildingId: string, unitId: string | number) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId(unitId);
    setViewMode('units');
  };

  const isAdmin = user?.email === 'bargil.michael@gmail.com';

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login lang={lang} setLang={setLang} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 ${lang === 'ru' ? 'text-left' : 'text-right'}`} dir={(lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm p-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <Logo />
            <div className="h-10 w-[1px] bg-gray-200 hidden md:block"></div>
            <div className="flex-1">
              <h1 className="text-lg font-black leading-none text-blue-900">{t.appName}</h1>
              <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-bold">{t.appSubName}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-black text-gray-700">{user.displayName}</span>
                <button onClick={logout} className="text-[10px] text-red-500 font-bold hover:underline">
                  {lang === 'he' ? 'התנתק' : 'Выйти'}
                </button>
              </div>
              <LanguageSelector currentLang={lang} onSelect={setLang} className="md:hidden" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-64 relative">
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className={`w-full bg-gray-50 border border-gray-200 rounded-full ${lang === 'ru' ? 'pl-10 pr-4' : 'pr-10 pl-4'} py-2 text-sm placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold transition-all`} 
              />
              <span className={`absolute ${lang === 'ru' ? 'right-3' : 'right-3'} top-2.5 opacity-30`}>🔍</span>
            </div>
            <LanguageSelector currentLang={lang} onSelect={setLang} className="hidden md:flex" />
            <button onClick={logout} className="hidden md:block bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full text-sm font-bold transition-colors border border-red-100 text-red-500 shadow-sm">
              {lang === 'he' ? 'התנתק' : 'Выйти'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pb-24 px-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 my-6 bg-slate-200/40 p-1.5 rounded-2xl w-full overflow-x-auto no-scrollbar md:w-fit mx-auto md:mx-0 shadow-inner border border-slate-300/20">
          <button onClick={() => setViewMode('units')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'units' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.viewUnits}</button>
          <button onClick={() => setViewMode('public')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'public' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.viewPublic}</button>
          <button onClick={() => setViewMode('contractors')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'contractors' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.viewContractors}</button>
          <button onClick={() => setViewMode('schedule')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'schedule' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.viewSchedule}</button>
          <button onClick={() => setViewMode('history')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'history' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.viewHistory}</button>
          {isAdmin && (
            <button onClick={() => setViewMode('users')} className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all ${viewMode === 'users' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {lang === 'he' ? 'משתמשים' : lang === 'ru' ? 'Пользователи' : 'المستخدمين'}
            </button>
          )}
        </div>

        {viewMode === 'contractors' ? (
          <ContractorView state={state} lang={lang} onSelectUnit={handleSelectFromOtherView} userRole={userRole} userDiscipline={userDiscipline} />
        ) : viewMode === 'schedule' ? (
          <ScheduleView state={state} lang={lang} onSelectUnit={handleSelectFromOtherView} userRole={userRole} userDiscipline={userDiscipline} />
        ) : viewMode === 'history' ? (
          <ProjectHistoryView state={state} lang={lang} onSelectUnit={handleSelectFromOtherView} userRole={userRole} userDiscipline={userDiscipline} />
        ) : viewMode === 'users' && isAdmin ? (
          <UserManagement lang={lang} />
        ) : (
          <>
            <section className="mt-4">
              <BuildingSelector buildings={filteredBuildings} selectedBuildingId={selectedBuildingId} onSelect={setSelectedBuildingId} state={state} lang={lang} discipline="general" />
            </section>

            {selectedBuildingId && (
              <section className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <BuildingCommittee 
                  building={state.buildings.find(b => b.id === selectedBuildingId)!}
                  onUpdate={(committee) => {
                    const newState = updateBuilding(state, selectedBuildingId, { committeeContact: committee });
                    setState(newState);
                  }}
                  lang={lang}
                  userRole={userRole}
                />
                
                {viewMode === 'units' ? (
                  <UnitGrid 
                    buildingId={selectedBuildingId} 
                    state={state} 
                    onSelectUnit={(num) => setSelectedUnitId(num)} 
                    onUpdateTenant={(num, name, phone) => {
                      const unit = getUnit(state, selectedBuildingId, num);
                      const newState = updateUnit(state, unit, { updateTenantInfo: { name, phone } });
                      setState(newState);
                    }}
                    lang={lang} 
                    discipline={(userRole === 'contractor' && userDiscipline !== 'all') ? (userDiscipline as Discipline) : 'general'} 
                    userRole={userRole}
                  />
                ) : (
                  <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                    <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
                       <span className="bg-blue-50 p-2 rounded-xl">🏢</span> {t.publicAreas}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {PUBLIC_AREAS.map(area => {
                        const unitData = getUnit(state, selectedBuildingId, area.id);
                        const currentDiscipline = (userRole === 'contractor' && userDiscipline !== 'all') ? (userDiscipline as Discipline) : 'general';
                        
                        let finalStatus = TaskStatus.NOT_STARTED;
                        if (currentDiscipline === 'general') {
                          const statuses = Object.values(unitData.statuses);
                          if (statuses.includes(TaskStatus.BLOCKED)) finalStatus = TaskStatus.BLOCKED;
                          else if (statuses.includes(TaskStatus.NEEDS_FOLLOWUP)) finalStatus = TaskStatus.NEEDS_FOLLOWUP;
                          else if (statuses.includes(TaskStatus.IN_PROGRESS)) finalStatus = TaskStatus.IN_PROGRESS;
                          else if (statuses.length > 0 && statuses.every(s => s === TaskStatus.DONE)) finalStatus = TaskStatus.DONE;
                        } else {
                          finalStatus = unitData.statuses[currentDiscipline] || TaskStatus.NOT_STARTED;
                        }
                        
                        const config = STATUS_CONFIG[finalStatus];
                        return (
                          <button key={area.id} onClick={() => setSelectedUnitId(area.id)} className={`flex items-center gap-5 p-6 rounded-2xl border-2 transition-all hover:shadow-xl active:scale-95 text-right group ${config.color}`}>
                            <span className="text-4xl group-hover:scale-110 transition-transform">{area.icon}</span>
                            <div className="flex flex-col">
                              <span className="font-black text-xl">{(t as any)[area.labelKey]}</span>
                              <span className="text-xs font-bold opacity-70">{(t as any)[config.labelKey]}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {activeUnit && (
        <UnitModal 
          key={activeUnit.id}
          unit={activeUnit} 
          onClose={() => setSelectedUnitId(null)} 
          onSave={handleUpdateUnit} 
          lang={lang} 
          activeDiscipline={(userRole === 'contractor' && userDiscipline !== 'all') ? (userDiscipline as Discipline) : 'general'} 
          userRole={userRole}
        />
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 text-center text-[10px] text-gray-400 z-30 font-bold uppercase tracking-widest shadow-sm">
        {t.footerInfo}
      </footer>
    </div>
  );
};

export default App;