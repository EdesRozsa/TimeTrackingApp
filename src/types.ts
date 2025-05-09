export interface TimeEntry {
    id: string;
    projectName: string;
    hours: number;
    minutes: number;
    rate: number;
    date: string;
    dateObj: Date;
  }
  
  export interface AppSettings {
    monthlyTargetAmount: number;
    targetRate: number;
  }