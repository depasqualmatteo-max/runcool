import { Platform } from 'react-native';

// Tipo generico per un allenamento importato da Health
export interface ImportedWorkout {
  id: string;
  name: string;
  workoutType: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm?: number;
  elevationMeters?: number;
  mappedWorkoutId: string | null;
  mappedWorkoutName: string;
}

// Ultimo errore per debugging
let _lastError: string | null = null;
export function getLastHealthError(): string | null {
  return _lastError;
}

// Mappa i tipi di workout HealthKit → RunCool workout IDs
const HEALTHKIT_TYPE_MAP: Record<number, { id: string; name: string }> = {
  37: { id: 'corsa',     name: 'Corsa' },       // running
  52: { id: 'camminata', name: 'Camminata' },    // walking
  63: { id: 'hiit',      name: 'HIIT' },         // HIIT
  20: { id: 'palestra',  name: 'Palestra' },     // functional strength training
  50: { id: 'palestra',  name: 'Palestra' },     // traditional strength training
  49: { id: 'tennis',    name: 'Tennis' },        // tennis
  33: { id: 'padel',     name: 'Padel' },        // racquetball (33 in HealthKit)
  43: { id: 'calcetto',  name: 'Calcetto' },     // soccer
  36: { id: 'pilates',   name: 'Pilates' },      // pilates
  46: { id: 'nuoto',     name: 'Nuoto' },        // swimming
  13: { id: 'ciclismo',  name: 'Ciclismo' },     // cycling
  17: { id: 'danza',     name: 'Danza' },        // dance
  47: { id: 'boxe',      name: 'Boxe' },         // boxing
  24: { id: 'camminata', name: 'Camminata' },    // hiking
  35: { id: 'hiit',      name: 'HIIT' },         // cross training
  62: { id: 'palestra',  name: 'Palestra' },     // core training
};

// Health Connect exercise types → RunCool
const HEALTH_CONNECT_TYPE_MAP: Record<number, { id: string; name: string }> = {
  56: { id: 'corsa',     name: 'Corsa' },
  79: { id: 'camminata', name: 'Camminata' },
  35: { id: 'hiit',      name: 'HIIT' },
  78: { id: 'palestra',  name: 'Palestra' },
  74: { id: 'tennis',    name: 'Tennis' },
  51: { id: 'padel',     name: 'Padel' },
  63: { id: 'calcetto',  name: 'Calcetto' },
  50: { id: 'pilates',   name: 'Pilates' },
  82: { id: 'pilates',   name: 'Pilates' },
  73: { id: 'nuoto',     name: 'Nuoto' },
  72: { id: 'nuoto',     name: 'Nuoto' },
  8:  { id: 'ciclismo',  name: 'Ciclismo' },
  6:  { id: 'boxe',      name: 'Boxe' },
  14: { id: 'danza',     name: 'Danza' },
  37: { id: 'camminata', name: 'Camminata' },
  55: { id: 'nuoto',     name: 'Nuoto' },
  22: { id: 'palestra',  name: 'Palestra' },
  66: { id: 'camminata', name: 'Camminata' },
  11: { id: 'hiit',      name: 'HIIT' },
};

function mapHealthKitType(typeId: number): { id: string; name: string } | null {
  return HEALTHKIT_TYPE_MAP[typeId] ?? null;
}

function mapHealthConnectType(typeId: number): { id: string; name: string } | null {
  return HEALTH_CONNECT_TYPE_MAP[typeId] ?? null;
}

// ============================================
// iOS: Apple HealthKit via @kingstinct/react-native-healthkit
// ============================================

async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const {
      requestAuthorization,
      isHealthDataAvailable,
    } = require('@kingstinct/react-native-healthkit');

    const available = isHealthDataAvailable();
    if (!available) {
      _lastError = 'HealthKit non disponibile su questo dispositivo';
      return false;
    }

    // AuthDataTypes = { toShare?: [...], toRead?: [...] }
    await requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierDistanceCycling',
        'HKQuantityTypeIdentifierDistanceSwimming',
        'HKWorkoutTypeIdentifier',
      ],
    });

    _lastError = null;
    return true;
  } catch (e: any) {
    _lastError = `HealthKit error: ${e?.message || String(e)}`;
    return false;
  }
}

async function fetchHealthKitWorkouts(daysBack: number = 7): Promise<ImportedWorkout[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const { queryWorkoutSamples } = require('@kingstinct/react-native-healthkit');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const workouts = await queryWorkoutSamples({
      limit: 0, // 0 = tutti
      filter: {
        date: {
          startDate,
          endDate: new Date(),
        },
      },
    });

    if (!workouts || workouts.length === 0) return [];

    return workouts.map((w: any) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      const activityType = w.workoutActivityType ?? 0;
      const mapped = mapHealthKitType(activityType);

      return {
        id: w.uuid || `hk_${start.getTime()}`,
        name: mapped?.name || w.workoutActivityType?.toString() || 'Allenamento',
        workoutType: String(activityType),
        startDate: start,
        endDate: end,
        durationMinutes,
        caloriesBurned: Math.round(w.totalEnergyBurned?.quantity ?? 0),
        distanceKm: (() => {
          const dist = w.totalDistance;
          if (!dist?.quantity) return undefined;
          let km = dist.quantity;
          if (dist.unit === 'm') km = dist.quantity / 1000;
          else if (dist.unit === 'mi') km = dist.quantity * 1.60934;
          // 'km' or unknown unit: use as-is
          return Math.round(km * 100) / 100;
        })(),
        mappedWorkoutId: mapped?.id ?? null,
        mappedWorkoutName: mapped?.name || 'Allenamento',
      };
    });
  } catch (e: any) {
    _lastError = `HealthKit fetch error: ${e?.message || String(e)}`;
    return [];
  }
}

// ==================================================
// Android: Google Health Connect via react-native-health-connect
// ==================================================

async function initHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  let step = 'start';
  try {
    step = 'require';
    const HC = require('react-native-health-connect');
    const { initialize, requestPermission, getSdkStatus, getGrantedPermissions } = HC;

    step = 'checkModule';
    if (!initialize || !requestPermission) {
      _lastError = `HC module keys: ${Object.keys(HC).join(',')}`;
      return false;
    }

    step = 'getSdkStatus';
    let sdkStatus: number = -1;
    try {
      sdkStatus = await getSdkStatus('com.google.android.apps.healthdata');
    } catch (e: any) {
      _lastError = `getSdkStatus fail: ${e?.message || e}`;
      return false;
    }
    // 1 = UNAVAILABLE, 2 = PROVIDER_UPDATE_REQUIRED, 3 = AVAILABLE
    if (sdkStatus !== 3) {
      _lastError = `Health Connect SDK status=${sdkStatus} (serve 3). Installa/aggiorna Health Connect dal Play Store.`;
      return false;
    }

    step = 'initialize';
    const initialized = await initialize('com.google.android.apps.healthdata');
    if (!initialized) {
      _lastError = 'initialize() ha restituito false';
      return false;
    }

    step = 'requestPermission';
    const perms = [
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'read', recordType: 'TotalCaloriesBurned' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'ElevationGained' },
    ];
    const granted = await requestPermission(perms);

    step = 'checkGranted';
    if (!granted || granted.length === 0) {
      // Verifica se effettivamente sono state concesse
      try {
        const already = await getGrantedPermissions();
        if (already && already.length > 0) {
          _lastError = null;
          return true;
        }
      } catch (_) {}
      _lastError = `Permessi non concessi (granted=${JSON.stringify(granted)})`;
      return false;
    }

    _lastError = null;
    return true;
  } catch (e: any) {
    _lastError = `[step=${step}] ${e?.message || String(e)}`;
    return false;
  }
}

async function fetchHealthConnectWorkouts(daysBack: number = 7): Promise<ImportedWorkout[]> {
  if (Platform.OS !== 'android') return [];
  try {
    const { readRecords } = require('react-native-health-connect');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { records: sessions } = await readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    // Leggi calorie aggregate per time range
    type TimeRecord = { startTime: string; endTime: string; value: number };
    const caloriesRecordsList: TimeRecord[] = [];
    try {
      const { records: cRecs } = await readRecords('TotalCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      for (const cr of cRecs) {
        caloriesRecordsList.push({
          startTime: cr.startTime,
          endTime: cr.endTime,
          value: cr.energy?.inKilocalories ?? 0,
        });
      }
    } catch (_) {}

    // Leggi distanza per time range
    const distanceRecordsList: TimeRecord[] = [];
    try {
      const { records: dRecs } = await readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      for (const dr of dRecs) {
        distanceRecordsList.push({
          startTime: dr.startTime,
          endTime: dr.endTime,
          value: dr.distance?.inKilometers ?? 0,
        });
      }
    } catch (_) {}

    // Leggi dislivello per time range
    const elevationRecordsList: TimeRecord[] = [];
    try {
      const { records: eRecs } = await readRecords('ElevationGained', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      for (const er of eRecs) {
        elevationRecordsList.push({
          startTime: er.startTime,
          endTime: er.endTime,
          value: er.elevation?.inMeters ?? 0,
        });
      }
    } catch (_) {}

    // Funzione per sommare records che si sovrappongono con una sessione
    function sumOverlapping(records: TimeRecord[], sessionStart: Date, sessionEnd: Date): number {
      let total = 0;
      for (const r of records) {
        const rStart = new Date(r.startTime).getTime();
        const rEnd = new Date(r.endTime).getTime();
        const sStart = sessionStart.getTime();
        const sEnd = sessionEnd.getTime();
        // Il record si sovrappone alla sessione?
        if (rStart < sEnd && rEnd > sStart) {
          total += r.value;
        }
      }
      return total;
    }

    const workouts: ImportedWorkout[] = (sessions || []).map((s: any) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      const exerciseType = s.exerciseType ?? 0;
      const mapped = mapHealthConnectType(exerciseType);

      const calories = Math.round(sumOverlapping(caloriesRecordsList, start, end));
      const rawDist = sumOverlapping(distanceRecordsList, start, end);
      const distanceKm = rawDist > 0 ? rawDist : undefined;
      const rawElev = sumOverlapping(elevationRecordsList, start, end);
      const elevationMeters = rawElev > 0 ? Math.round(rawElev) : undefined;

      return {
        id: s.metadata?.id || `hc_${start.getTime()}`,
        name: mapped?.name || s.title || `Esercizio tipo ${exerciseType}`,
        workoutType: String(exerciseType),
        startDate: start,
        endDate: end,
        durationMinutes,
        caloriesBurned: calories,
        distanceKm: distanceKm ? Math.round(distanceKm * 100) / 100 : undefined,
        elevationMeters,
        mappedWorkoutId: mapped?.id ?? null,
        mappedWorkoutName: mapped?.name || s.title || 'Allenamento',
      };
    });

    return workouts;
  } catch (e: any) {
    _lastError = `Health Connect fetch error: ${e?.message || String(e)}`;
    return [];
  }
}

// ============================================
// API pubblica cross-platform
// ============================================

export async function initHealth(): Promise<boolean> {
  if (Platform.OS === 'ios') return initHealthKit();
  if (Platform.OS === 'android') return initHealthConnect();
  _lastError = 'Piattaforma non supportata';
  return false;
}

export async function fetchRecentWorkouts(daysBack: number = 7): Promise<ImportedWorkout[]> {
  if (Platform.OS === 'ios') return fetchHealthKitWorkouts(daysBack);
  if (Platform.OS === 'android') return fetchHealthConnectWorkouts(daysBack);
  return [];
}

export function isHealthAvailable(): boolean {
  // iOS: HealthKit, Android: Health Connect (con patch delegate custom)
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
