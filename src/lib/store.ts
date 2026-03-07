export interface VitalSigns {
  seatNumber: string;
  heartRate: number;
  respiratoryRate: number;
  bloodPressure: string;
  symptoms?: string;
}

export interface TriageRecord extends VitalSigns {
  id: string;
  timestamp: string;
}

// Global in-memory store for a Next.js server environment.
// In development, Next.js clears module state on HMR, so we attach it to the `global` object.
// In production, normal variables work fine, but this handles both.

const globalForStore = global as unknown as {
  triageRecords: TriageRecord[];
};

export const triageRecords: TriageRecord[] = globalForStore.triageRecords || [];

if (process.env.NODE_ENV !== "production") {
  globalForStore.triageRecords = triageRecords;
}

export function addRecord(record: Omit<TriageRecord, "id" | "timestamp">) {
  const newRecord: TriageRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  triageRecords.unshift(newRecord); // Add to the beginning of the list
  return newRecord;
}

export function getRecords() {
  return triageRecords;
}
