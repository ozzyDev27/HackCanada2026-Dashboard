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
  priorityRank?: number;
  riskLevel?: "red" | "yellow" | "green";
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
  triageRecords.unshift(newRecord);
  return newRecord;
}

export function getRecords() {
  return triageRecords;
}

export function updatePriorities(rankedIds: string[]) {
  rankedIds.forEach((id, index) => {
    const record = triageRecords.find((r) => r.id === id);
    if (record) {
      record.priorityRank = index + 1;
    }
  });
}

export function deleteRecord(id: string): boolean {
  const index = triageRecords.findIndex((r) => r.id === id);
  if (index === -1) return false;
  triageRecords.splice(index, 1);
  return true;
}

export function setRiskLevel(id: string, level: "red" | "yellow" | "green") {
  const record = triageRecords.find((r) => r.id === id);
  if (record) record.riskLevel = level;
}
