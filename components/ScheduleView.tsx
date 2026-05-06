import React, { useState } from 'react';
import { ProjectState, Unit, Appointment } from '../types';
import { Language, translations } from '../translations';
import { CONTRACTORS, PUBLIC_AREAS } from '../constants';

interface Props {
  state: ProjectState;
  lang: Language;
  onSelectUnit: (buildingId: string, unitId: string | number) => void;
  userRole: 'admin' | 'contractor' | 'viewer';
  userDiscipline: string;
}

const ITEMS_PER_PAGE = 4;

const ScheduleView: React.FC<Props> = ({ state, lang, onSelectUnit, userRole, userDiscipline }) => {
  const t = translations[lang];
  const [currentPage, setCurrentPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow'>('all');

  const triggerCalendarInvite = (app: Appointment, unit: Unit) => {
    const unitIdentifier = unit.id.split('-').slice(1).join('-');
    const isPublicArea = isNaN(Number(unitIdentifier));
    const publicAreaConfig = isPublicArea ? PUBLIC_AREAS.find(a => a.id === unitIdentifier) : null;
    const unitName = isPublicArea ? (t as any)[publicAreaConfig?.labelKey || ''] : `${t.apartment} ${unitIdentifier}`;

    const title = encodeURIComponent(`${t.appName}: ${unitName}`);
    const details = encodeURIComponent(`${t.building}: ${unit.buildingId.split('-')[1]}, ${t.unitLabel}: ${unit.id.split('-')[1]}\n${t.tenantLabel}: ${app.tenantName}\n${t.notesLabel}: ${app.notes}`);
    const dateStr = app.date.replace(/-/g, '');
    const timeStr = app.time.replace(/:/g, '') + '00';
    const endTimeStr = (Number(timeStr) + 10000).toString().padStart(6, '0');
    
    const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateStr}T${timeStr}/${dateStr}T${endTimeStr}`;
    
    const body = encodeURIComponent(`${t.scheduleTitle}:\n${t.dateLabel}: ${app.date}\n${t.timeLabel}: ${app.time}\n${t.tenantLabel}: ${app.tenantName}\n\n${t.notesLabel}: ${app.notes}\n\n${lang === 'he' ? 'להוספה ליומן לחץ כאן' : lang === 'ru' ? 'Нажмите здесь, чтобы добавить في التقويم' : 'اضغط هنا للإضافة إلى التقويم'}:\n${gCalUrl}`);
    
    window.location.href = `mailto:${app.contractorEmail}?subject=${title}&body=${body}`;
  };

  // Flatten all appointments from all units
  const allAppointments: { unit: Unit, app: Appointment }[] = [];
  (Object.values(state.units) as Unit[]).forEach(unit => {
    unit.appointments.forEach(app => {
      if (!app.isCompleted) {
        const contractorId = CONTRACTORS.find(c => (t as any)[c.labelKey] === app.contractor)?.id;
        
        let matchesDiscipline = userRole !== 'contractor' || userDiscipline === 'all';
        if (!matchesDiscipline) {
          if (userDiscipline === 'plumbing') {
            matchesDiscipline = contractorId === 'plumber';
          } else {
            matchesDiscipline = contractorId === userDiscipline;
          }
        }

        if (matchesDiscipline) {
          allAppointments.push({ unit, app });
        }
      }
    });
  });

  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  // Filter appointments for the list
  const filteredAppointments = allAppointments.filter(({ app }) => {
    if (dateFilter === 'today') return app.date === today;
    if (dateFilter === 'tomorrow') return app.date === tomorrow;
    return true;
  });

  // Sort by date and time
  filteredAppointments.sort((a, b) => 
    new Date(`${a.app.date} ${a.app.time}`).getTime() - new Date(`${b.app.date} ${b.app.time}`).getTime()
  );

  // Group appointments by date for load analysis
  const loadByDate: Record<string, Record<string, number>> = {};
  allAppointments.forEach(({ app }) => {
    if (!loadByDate[app.date]) {
      loadByDate[app.date] = {};
    }
    loadByDate[app.date][app.contractor] = (loadByDate[app.date][app.contractor] || 0) + 1;
  });

  const sortedDates = Object.keys(loadByDate).sort();
  const totalPages = Math.ceil(sortedDates.length / ITEMS_PER_PAGE);
  const visibleDates = sortedDates.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          {t.viewSchedule}
        </h2>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setDateFilter('all')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${dateFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.allUnits}
          </button>
          <button 
            onClick={() => setDateFilter('today')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${dateFilter === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.today}
          </button>
          <button 
            onClick={() => setDateFilter('tomorrow')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${dateFilter === 'tomorrow' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.tomorrow}
          </button>
        </div>
      </div>

      {/* Load Analysis Section */}
      {allAppointments.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="bg-blue-50 p-2 rounded-xl text-xl">📊</span>
              <div>
                <h3 className="font-black text-gray-800 leading-tight">{t.loadAnalysis}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{t.totalAppointments}: {allAppointments.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button 
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title={lang === 'he' ? 'הקודם' : lang === 'ru' ? 'Назад' : 'السابق'}
              >
                {(lang === 'he' || lang === 'ar') ? '←' : '←'}
              </button>
              <span className="text-xs font-black text-gray-500 px-2 min-w-[60px] text-center">
                {currentPage + 1} / {totalPages || 1}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title={lang === 'he' ? 'הבא' : lang === 'ru' ? 'Вперед' : 'التالي'}
              >
                {(lang === 'he' || lang === 'ar') ? '→' : '→'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleDates.map(date => (
              <div key={date} className={`p-4 rounded-2xl border-2 transition-all ${date === today ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-gray-700">{date === today ? t.today : date}</span>
                  <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-black text-blue-600 shadow-sm border border-blue-50">
                    {Object.values(loadByDate[date]).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(loadByDate[date]).map(([contractor, count]) => {
                    const contractorConfig = CONTRACTORS.find(c => (t as any)[c.labelKey] === contractor);
                    return (
                      <div key={contractor} className="flex justify-between items-center group">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                          <span className="opacity-70">{contractorConfig?.icon || '👤'}</span>
                          {contractor}
                        </span>
                        <span className={`text-[11px] font-black px-1.5 rounded-md ${count > 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {Object.values(loadByDate[date]).reduce((a, b) => a + b, 0) > 5 && (
                  <div className="mt-3 pt-2 border-t border-red-100">
                    <p className="text-[9px] text-red-500 font-black uppercase text-center">
                      {lang === 'he' ? '⚠️ עומס גבוה ביום זה' : lang === 'ru' ? '⚠️ Высокая нагрузка' : '⚠️ ضغط عمل مرتفع اليوم'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed text-gray-400">
          <div className="text-4xl mb-4">📭</div>
          <p>{t.noAppointments}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map(({ unit, app }) => {
            // Correct extraction of building number and unit identifier
            const buildingNum = unit.buildingId.split('-')[1];
            const unitIdParts = unit.id.split('-');
            const unitIdentifier = unitIdParts[unitIdParts.length - 1];
            const isPublic = isNaN(Number(unitIdentifier));
            const isToday = app.date === today;
            
            // Find contractor icon
            const contractorConfig = CONTRACTORS.find(c => (t as any)[c.labelKey] === app.contractor);

            return (
              <button
                key={app.id}
                onClick={() => onSelectUnit(unit.buildingId, isPublic ? unitIdentifier : Number(unitIdentifier))}
                className={`text-right group p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {isToday ? t.today : app.date}
                  </div>
                  <div className="text-lg font-bold text-blue-900">{app.time}</div>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium opacity-60">{t.building} {buildingNum}</span>
                    <span className="mx-2 opacity-30">|</span>
                    <span className="font-bold text-blue-800">
                      {isPublic ? (t as any)[`area_${unitIdentifier}`] : `${t.apartment} ${unitIdentifier}`}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span>👤</span> {app.tenantName}
                    </span>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1 ${app.contractor.includes('מנהל') ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-blue-700 border-blue-100'}`}>
                      {contractorConfig?.icon || '👔'} {app.contractor}
                    </span>
                  </div>
                </div>

                {app.notes && (
                  <div className="text-[11px] text-gray-600 bg-white/50 p-2 rounded-lg border border-gray-200/50 italic mt-2">
                    {app.notes}
                  </div>
                )}
                
                <div className="mt-3 flex justify-between items-center">
                   {app.contractorEmail && (
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         triggerCalendarInvite(app, unit);
                       }}
                       className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 flex items-center gap-1"
                     >
                       📧 {t.sendInvite}
                     </button>
                   )}
                   <span className="text-[10px] text-blue-500 font-bold group-hover:underline">
                     {lang === 'he' ? 'צפייה בכרטיס הדירה ←' : lang === 'ru' ? 'Посмотреть карту ←' : 'عرض ملف الشقة ←'}
                   </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScheduleView;