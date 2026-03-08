export interface PatientInfo {
  healthCardNumber: string;
  name: string;
  dob: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

export interface VitalSigns {
  seatNumber: string;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressure?: string;
  symptoms?: string;
  healthCardNumber: string;
}

export interface TriageRecord extends VitalSigns {
  id: string;
  timestamp: string;
  priorityRank?: number;
  priorityScore?: number;
  riskLevel?: "red" | "yellow" | "green";
  symptomSummary?: string;
  healthCardSummary?: string;
  previousSymptoms?: string;
  patientInfo?: PatientInfo;
}

const g = global as unknown as { triageRecords: TriageRecord[] };
export const triageRecords: TriageRecord[] = g.triageRecords || [];
if (process.env.NODE_ENV !== "production") g.triageRecords = triageRecords;

export function addRecord(record: Omit<TriageRecord, "id" | "timestamp">) {
  const newRecord: TriageRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  triageRecords.unshift(newRecord);
  return newRecord;
}

export function upsertRecord(
  record: Omit<TriageRecord, "id" | "timestamp">,
  timestamp?: string
): { record: TriageRecord; previousSymptoms?: string } {
  const existing = triageRecords.find((r) => r.seatNumber === record.seatNumber);

  if (existing) {
    const previousSymptoms = existing.symptomSummary ?? existing.symptoms;
    existing.heartRate = record.heartRate ?? existing.heartRate;
    existing.respiratoryRate = record.respiratoryRate ?? existing.respiratoryRate;
    existing.bloodPressure = record.bloodPressure ?? existing.bloodPressure;
    existing.symptoms = record.symptoms ?? existing.symptoms;
    existing.healthCardNumber = record.healthCardNumber ?? existing.healthCardNumber;
    existing.patientInfo = record.patientInfo ?? existing.patientInfo;
    existing.timestamp = timestamp ?? new Date().toISOString();
    existing.riskLevel = undefined;
    existing.priorityScore = undefined;
    existing.symptomSummary = undefined;
    existing.healthCardSummary = undefined;
    existing.previousSymptoms = previousSymptoms;
    return { record: existing, previousSymptoms };
  }

  const newRecord: TriageRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
  };
  triageRecords.unshift(newRecord);
  return { record: newRecord };
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

export function setPriorityScore(id: string, score: number) {
  const record = triageRecords.find((r) => r.id === id);
  if (record) record.priorityScore = score;
}

export function setSymptomSummary(id: string, summary: string) {
  const record = triageRecords.find((r) => r.id === id);
  if (record) record.symptomSummary = summary;
}

export function setHealthCardSummary(id: string, summary: string) {
  const record = triageRecords.find((r) => r.id === id);
  if (record) record.healthCardSummary = summary;
}
