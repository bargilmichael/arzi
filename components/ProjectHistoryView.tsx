import React, { useState, useMemo } from 'react';
import { ProjectState, TaskLog, Unit } from '../types';
import { STATUS_CONFIG, CONTRACTORS, PUBLIC_AREAS, UNITS_PER_BUILDING } from '../constants';
import { Language, translations } from '../translations';

interface Props {
  state: ProjectState;
  lang: Language;
  onSelectUnit: (buildingId: string, unitId: string | number) => void;
  userRole: 'admin' | 'contractor' | 'viewer';
  userDiscipline: string;
}

const ProjectHistoryView: React.FC<Props> = ({ state, lang, onSelectUnit, userRole, userDiscipline }) => {
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');

  const t = translations[lang];

  // Flatten and filter logs
  const filteredLogs = useMemo(() => {
    const allLogs: { log: TaskLog, unit: Unit }[] = [];
    (Object.values(state.units) as Unit[]).forEach(unit => {
      unit.history.forEach(log => {
        const matchesBuilding = filterBuilding === 'all' || unit.buildingId === filterBuilding;
        const matchesContractor = filterContractor === 'all' || log.contractor === filterContractor;
        const matchesDiscipline = userRole !== 'contractor' || userDiscipline === 'all' || log.discipline === userDiscipline;
        
        const unitIdParts = unit.id.split('-');
        const unitIdentifier = unitIdParts[unitIdParts.length - 1];
        const matchesUnit = filterUnit === 'all' || unitIdentifier === filterUnit;

        if (matchesBuilding && matchesContractor && matchesUnit && matchesDiscipline) {
          allLogs.push({ log, unit });
        }
      });
    });
    // Sort by newest first
    return allLogs.sort((a, b) => b.log.timestamp - a.log.timestamp);
  }, [state, filterBuilding, filterContractor, filterUnit]);

  const resetFilters = () => {
    setFilterBuilding('all');
    setFilterContractor('all');
    setFilterUnit('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">📜</span>
          {t.fullHistoryTitle}
        </h2>
        
        {/* Filters Grid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Building Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{t.filterByBuilding}</label>
            <select 
              value={filterBuilding} 
              onChange={(e) => {
                setFilterBuilding(e.target.value);
                setFilterUnit('all'); // Reset unit when building changes to avoid confusion
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">{t.allBuildings}</option>
              {state.buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {lang === 'ru' ? b.name.replace('בניין', 'Здание') : lang === 'ar' ? b.name.replace('בניין', 'مبنى') : b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contractor Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{t.filterByContractor}</label>
            <select 
              value={filterContractor} 
              onChange={(e) => setFilterContractor(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">{t.allContractors}</option>
              {CONTRACTORS.filter(c => {
                if (userRole !== 'contractor' || userDiscipline === 'all') return true;
                if (userDiscipline === 'plumbing') return c.id === 'plumber';
                return c.id === userDiscipline;
              }).map(c => (
                <option key={c.id} value={(t as any)[c.labelKey]}>{c.icon} {(t as any)[c.labelKey]}</option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{t.filterByUnit}</label>
            <select 
              value={filterUnit} 
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">{t.allUnits}</option>
              <optgroup label={t.apartment}>
                {Array.from({ length: UNITS_PER_BUILDING }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num.toString()}>{t.apartment} {num}</option>
                ))}
              </optgroup>
              <optgroup label={t.publicAreas}>
                {PUBLIC_AREAS.map(area => (
                  <option key={area.id} value={area.id}>{(t as any)[area.labelKey]}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button 
              onClick={resetFilters}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-400 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              {lang === 'he' ? 'הסר מסננים ×' : lang === 'ru' ? 'Сбросить фильтры ×' : 'إزالة الفلاتر ×'}
            </button>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed text-gray-400">
          <div className="text-4xl mb-4">📂</div>
          <p>{t.noHistory}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-gray-400 px-2 uppercase tracking-widest">
            {t.resultsFound.replace('{count}', filteredLogs.length.toString())}
          </div>
          {filteredLogs.map(({ log, unit }) => {
            const buildingNum = unit.buildingId.split('-')[1];
            const unitIdParts = unit.id.split('-');
            const unitIdentifier = unitIdParts[unitIdParts.length - 1];
            const isPublic = isNaN(Number(unitIdentifier));
            const statusCfg = STATUS_CONFIG[log.status];

            return (
              <div 
                key={log.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-blue-200 transition-colors"
              >
                <div className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-[90px] bg-gray-50`}>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">{t.building} {buildingNum}</span>
                  <span className="text-lg font-black text-blue-900 leading-tight">
                    {isPublic ? (lang === 'he' ? 'ציבורי' : lang === 'ru' ? 'Общ.' : 'عام') : unitIdentifier}
                  </span>
                  {isPublic && <span className="text-[8px] text-blue-500 font-bold">{(t as any).publicArea}</span>}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{log.workerName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${log.contractor.includes('מנהל') ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      {log.contractor}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      {new Date(log.timestamp).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : 'he-IL')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 md:line-clamp-1">{log.description}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <span className={`text-[10px] px-3 py-1 rounded-full border font-bold ${statusCfg.color}`}>
                    {(t as any)[statusCfg.labelKey]}
                  </span>
                  <button 
                    onClick={() => onSelectUnit(unit.buildingId, isPublic ? unitIdentifier : Number(unitIdentifier))}
                    className="text-blue-600 text-xs font-bold hover:underline whitespace-nowrap bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    {t.apartment} ←
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectHistoryView;