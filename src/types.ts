export interface TimeEntry {
    id: string;
    projectName: string;
    hours: number;
    minutes: number;
    rate: number;
    date: string;
    dateObj: Date;
    notes?: string;
  }
  
  export interface AppSettings {
    monthlyTargetAmount: number;
    targetRate: number;
  }