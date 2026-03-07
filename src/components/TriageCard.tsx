interface TriageCardProps {
  id: string;
  seatNumber: number;
  heartRate: number;
  respiratoryRate: number;
  bloodPressure: string;
  symptoms?: string;
  timestamp: string;
  priorityRank?: number;
  riskLevel?: "red" | "yellow" | "green";
  onDismiss?: () => void;
}

export default function TriageCard({
  seatNumber,
  heartRate,
  respiratoryRate,
  bloodPressure,
  symptoms,
  timestamp,
  priorityRank,
  riskLevel,
  onDismiss,
}: TriageCardProps) {
  const cardStyles = {
    red: "border-red-300 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/25",
    yellow: "border-yellow-300 bg-yellow-50/60 dark:border-yellow-800/60 dark:bg-yellow-950/25",
    green: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    pending: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
  };
  const barStyles = {
    red: "bg-red-500",
    yellow: "bg-yellow-400",
    green: "bg-emerald-500",
    pending: "bg-zinc-300 dark:bg-zinc-700",
  };
  const styleKey = riskLevel ?? "pending";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${cardStyles[styleKey]}`}
    >
      {/* Accent Top Bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${barStyles[styleKey]}`} />

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Dismiss patient"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Seat / Patient Location
          </h3>
          <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {seatNumber}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {priorityRank !== undefined ? (
            <span
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                priorityRank === 1
                  ? "bg-red-600 text-white"
                  : priorityRank === 2
                  ? "bg-orange-500 text-white"
                  : priorityRank === 3
                  ? "bg-yellow-400 text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
              }`}
            >
              #{priorityRank} Priority
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-400 dark:bg-zinc-800">
              Ranking…
            </span>
          )}
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
              Recorded At
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="my-4 flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50">
          <span className="text-xs font-medium tracking-wider text-zinc-500">
            Heart Rate
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {heartRate} <span className="text-xs font-normal text-zinc-500">bpm</span>
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50">
          <span className="text-xs font-medium tracking-wider text-zinc-500">
            Resp. Rate
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {respiratoryRate} <span className="text-xs font-normal text-zinc-500">/min</span>
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50">
          <span className="text-xs font-medium tracking-wider text-zinc-500">
            Blood Pressure
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {bloodPressure} <span className="text-xs font-normal text-zinc-500">mmHg</span>
          </span>
        </div>
      </div>

      {symptoms && (
        <div className="mt-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-800/30">
          <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
            Reported Symptoms
          </h4>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
            {symptoms}
          </p>
        </div>
      )}
    </div>
  );
}
