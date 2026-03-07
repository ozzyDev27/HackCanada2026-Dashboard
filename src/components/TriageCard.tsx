interface TriageCardProps {
  id: string;
  seatNumber: string;
  heartRate: number;
  respiratoryRate: number;
  bloodPressure: string;
  symptoms?: string;
  timestamp: string;
}

export default function TriageCard({
  seatNumber,
  heartRate,
  respiratoryRate,
  bloodPressure,
  symptoms,
  timestamp,
}: TriageCardProps) {
  // Simple "status" logic for styling severity based on basic HR bounds for demo purposes
  const isHighRisk = heartRate > 100 || heartRate < 50 || respiratoryRate > 24 || respiratoryRate < 10;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${isHighRisk
        ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
    >
      {/* Accent Top Bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${isHighRisk ? "bg-red-500" : "bg-emerald-500"
          }`}
      />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Seat / Patient Location
          </h3>
          <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {seatNumber}
          </p>
        </div>
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
