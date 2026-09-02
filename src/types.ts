export interface ColumnConfig {
  id: string;
  title: string;
  band: string;
  visible: boolean;
  color?: string;
  currentFrequency?: number;
}

export interface DxSpot {
  id: string;
  frequency: number;
  dxCall: string;
  spotterCall: string;
  info: string;
  timestamp: string; // ISO string
  isManual?: boolean;
  locator?: string;
  distance?: number; // in km
  bearing?: number;  // in degrees (0-359)
}

export interface AppConfig {
  columns: ColumnConfig[];
  bottomAreaVisible: boolean;
  retentionHours: number;
  autoBandSwitch: boolean;
  clusterHost: string;
  clusterPort: number;
  clusterCallsign: string;
  qthLocator: string;
  showFlags?: boolean;
  alertSound?: boolean;
  showSpotMap?: boolean;
}

export const BAND_FREQUENCIES: Record<string, { min: number, max: number }> = {
  "160m": { min: 1.810, max: 2.000 },
  "80m": { min: 3.500, max: 3.800 },
  "40m": { min: 7.000, max: 7.200 },
  "30m": { min: 10.100, max: 10.150 },
  "20m": { min: 14.000, max: 14.350 },
  "17m": { min: 18.068, max: 18.168 },
  "15m": { min: 21.000, max: 21.450 },
  "12m": { min: 24.890, max: 24.990 },
  "10m": { min: 28.000, max: 29.700 },
  "6m": { min: 50.000, max: 52.000 },
  "4m": { min: 70.000, max: 70.500 },
  "2m": { min: 144.000, max: 146.000 },
  "70cm": { min: 430.000, max: 440.000 },
  "23cm": { min: 1240.000, max: 1300.000 },
  "13cm": { min: 2320.000, max: 2450.000 },
  "6cm": { min: 5650.000, max: 5850.000 },
  "3cm": { min: 10000.000, max: 10500.000 },
};

export const HAM_BANDS = Object.keys(BAND_FREQUENCIES);
