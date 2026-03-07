interface PatientInfo {
  healthCardNumber: string;
  name: string;
  dob: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

interface TriageCardProps {
  id: string;
  seatNumber: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressure?: string;
  symptoms?: string;
  symptomSummary?: string;
  timestamp: string;
  priorityRank?: number;
  riskLevel?: "red" | "yellow" | "green";
  patientInfo?: PatientInfo;
  healthCardSummary?: string;
  onDismiss?: () => void;
}

export default function TriageCard({
  seatNumber,
  heartRate,
  respiratoryRate,
  bloodPressure,
  symptoms,
  symptomSummary,
  timestamp,
  priorityRank,
  riskLevel,
  patientInfo,
  healthCardSummary,
  onDismiss,
}: TriageCardProps) {
  const bandColor: Record<string, string> = {
    red:     "var(--band-red)",
    yellow:  "var(--band-yellow)",
    green:   "var(--band-green)",
    pending: "var(--band-pending)",
  };
  const bandText = riskLevel === "yellow" ? "#000000" : "#ffffff";
  const styleKey = riskLevel ?? "pending";

  const topLabel = priorityRank !== undefined ? `#${priorityRank}` : "Ranking…";

  const timeStr = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const notes: string[] = [];
  if (patientInfo) {
    if (patientInfo.allergies.length > 0)
      notes.push(`Allergy: ${patientInfo.allergies.join(", ")}`);
    if (patientInfo.medications.length > 0)
      notes.push(`Medication: ${patientInfo.medications.join(", ")}`);
    if (patientInfo.conditions.length > 0)
      notes.push(`Condition: ${patientInfo.conditions.join(", ")}`);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl" style={{ backgroundColor: "var(--card-bg)" }}>
      {/* Coloured top band */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: bandColor[styleKey] }}
      >
        <span className="text-sm font-bold" style={{ color: bandText }}>{topLabel}</span>
        <span className="text-sm font-semibold" style={{ color: bandText }}>{timeStr}</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-4">
        {/* Seat */}
        <p className="text-white">
          <span className="text-base font-bold">Seat number: </span>
          <span className="text-3xl font-bold">{seatNumber}</span>
        </p>

        {/* Vitals */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded-full px-4 py-1.5" style={{ backgroundColor: "var(--pill-bg)" }}>
            <span className="text-sm font-semibold text-white">Heart Rate</span>
            <span className="text-sm font-semibold text-white">{heartRate || "???"} <span className="font-normal">bpm</span></span>
          </div>
          <div className="flex items-center justify-between rounded-full px-4 py-1.5" style={{ backgroundColor: "var(--pill-bg)" }}>
            <span className="text-sm  font-semibold text-white">Resp. Rate</span>
            <span className="text-sm font-semibold text-white">{respiratoryRate || "???"}<span className="font-normal">/min</span></span>
          </div>
          <div className="flex items-center justify-between rounded-full px-4 py-1.5" style={{ backgroundColor: "var(--pill-bg)" }}>
            <span className="text-sm font-semibold text-white">Blood Pressure</span>
            <span className="text-sm font-semibold text-white">{bloodPressure || "???"}</span>
          </div>
        </div>

        {/* Symptoms */}
        <div>
          <p className="mb-0.5 text-sm font-bold text-white">Reported symptoms</p>
          <p className="text-sm text-zinc-300">{symptomSummary ?? symptoms ?? "None reported"}</p>
        </div>

        {/* Health Card Notes */}
        <div>
          <p className="mb-0.5 text-sm font-bold text-white">Health Card Notes</p>
          {healthCardSummary ? (
            <p className="text-sm text-zinc-300">{healthCardSummary}</p>
          ) : notes.length > 0 ? (
            notes.map((note, i) => (
              <p key={i} className="text-sm text-zinc-300">{note}</p>
            ))
          ) : (
            <p className="text-sm italic text-zinc-500">No health card on file</p>
          )}
        </div>

        {/* Send to doctor */}
        <button
          onClick={onDismiss}
          className="mt-auto w-full rounded-xl py-2.5 text-sm font-bold transition"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--btn-primary-hover)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)")}
          onMouseDown={e => (e.currentTarget.style.backgroundColor = "var(--btn-primary-active)")}
        >
          Send to doctor
        </button>
      </div>
    </div>
  );
}
