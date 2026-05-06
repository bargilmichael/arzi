
export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  NEEDS_FOLLOWUP = 'NEEDS_FOLLOWUP',
  BLOCKED = 'BLOCKED'
}

export type Discipline = 'plumbing' | 'general' | 'rappelling' | 'telefire' | 'itumit' | 'emperion' | 'workers';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  tenantName: string;
  contractor: string;
  contractorEmail?: string;
  notes: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface TaskLog {
  id: string;
  timestamp: number;
  workerName: string;
  contractor: string;
  description: string;
  status: TaskStatus;
  discipline: Discipline;
  images?: string[]; // Array of base64 strings
}

export interface TenantInfo {
  name: string;
  phone: string;
}

export interface Unit {
  id: string;
  buildingId: string;
  number: number;
  tenantInfo?: TenantInfo;
  statuses: Record<Discipline, TaskStatus>;
  history: TaskLog[];
  appointments: Appointment[];
}

export interface Building {
  id: string;
  name: string;
  totalUnits: number;
  committeeContact?: TenantInfo;
}

export interface ProjectState {
  buildings: Building[];
  units: Record<string, Unit>;
}
