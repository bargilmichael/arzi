
import { ProjectState, Building, Unit, TaskStatus, TaskLog, Discipline, Appointment, TenantInfo } from '../types';
import { BUILDINGS_COUNT, UNITS_PER_BUILDING } from '../constants';

const STORAGE_KEY = 'plumbtrack_data_v1';

export const initializeData = (): ProjectState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  const buildings: Building[] = Array.from({ length: BUILDINGS_COUNT }, (_, i) => ({
    id: `b-${i + 1}`,
    name: `בניין ${i + 1}`,
    totalUnits: UNITS_PER_BUILDING
  }));

  const initialState: ProjectState = {
    buildings,
    units: {}
  };

  return initialState;
};

export const saveData = (state: ProjectState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getUnit = (state: ProjectState, buildingId: string, unitId: string | number): Unit => {
  const key = `${buildingId}-${unitId}`;
  if (state.units[key]) return state.units[key];
  
  return {
    id: key,
    buildingId,
    number: typeof unitId === 'number' ? unitId : 0,
    statuses: {
      plumbing: TaskStatus.NOT_STARTED,
      general: TaskStatus.NOT_STARTED,
      rappelling: TaskStatus.NOT_STARTED,
      telefire: TaskStatus.NOT_STARTED,
      itumit: TaskStatus.NOT_STARTED,
      emperion: TaskStatus.NOT_STARTED,
      workers: TaskStatus.NOT_STARTED
    },
    history: [],
    appointments: []
  };
};

export const updateUnit = (
  state: ProjectState, 
  unit: Unit, 
  updates: { 
    newLog?: Omit<TaskLog, 'id' | 'timestamp'>,
    updateLogStatus?: { logId: string, newStatus: TaskStatus },
    newAppointment?: Omit<Appointment, 'id' | 'createdAt' | 'isCompleted'>,
    completeAppointmentId?: string,
    updateTenantInfo?: { name: string, phone: string }
  }
): ProjectState => {
  const newState = { ...state };
  const updatedUnit = { ...unit };

  if (updates.updateTenantInfo) {
    updatedUnit.tenantInfo = updates.updateTenantInfo;
  }

  if (updates.updateLogStatus) {
    const { logId, newStatus } = updates.updateLogStatus;
    updatedUnit.history = updatedUnit.history.map(log => {
      if (log.id === logId) {
        const updatedLog = { ...log, status: newStatus };
        updatedUnit.statuses = {
          ...updatedUnit.statuses,
          [log.discipline]: newStatus
        };
        return updatedLog;
      }
      return log;
    });
  }

  if (updates.newLog) {
    const logEntry: TaskLog = {
      ...updates.newLog,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    updatedUnit.history = [logEntry, ...updatedUnit.history];
    updatedUnit.statuses = {
      ...updatedUnit.statuses,
      [updates.newLog.discipline]: updates.newLog.status
    };
  }

  if (updates.newAppointment) {
    const appointment: Appointment = {
      ...updates.newAppointment,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isCompleted: false
    };
    updatedUnit.appointments = [...updatedUnit.appointments, appointment].sort((a, b) => 
      new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime()
    );
  }

  if (updates.completeAppointmentId) {
    updatedUnit.appointments = updatedUnit.appointments.map(app => 
      app.id === updates.completeAppointmentId ? { ...app, isCompleted: true } : app
    );
  }

  newState.units[unit.id] = updatedUnit;
  saveData(newState);
  return newState;
};

export const updateBuilding = (
  state: ProjectState,
  buildingId: string,
  updates: { committeeContact?: TenantInfo }
): ProjectState => {
  const newState = { ...state };
  newState.buildings = newState.buildings.map(b => 
    b.id === buildingId ? { ...b, ...updates } : b
  );
  saveData(newState);
  return newState;
};
