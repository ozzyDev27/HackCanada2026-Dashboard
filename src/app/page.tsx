"use client";

import { useEffect, useState } from "react";
import TriageCard from "@/components/TriageCard";

interface TriageRecord {
  id: string;
  seatNumber: string;
  heartRate: number;
  respiratoryRate: number;
  bloodPressure: string;
  symptoms?: string;
  timestamp: string;
}

export default function Home() {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/triage");
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Failed to fetch triage records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Poll for new records every 5 seconds
    const intervalId = setInterval(fetchRecords, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Triage Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Live patient vitals monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
              System Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Incoming Patients</h2>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {records.length} total
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
            <p className="mt-4 text-sm text-zinc-500">Loading patient data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 py-32 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-4 rounded-full bg-white p-4 shadow-sm dark:bg-zinc-900">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium">No patients waiting</h3>
            <p className="mt-1 text-sm text-zinc-500">
              New triage records will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {records.map((record) => (
              <TriageCard
                key={record.id}
                id={record.id}
                seatNumber={record.seatNumber}
                heartRate={record.heartRate}
                respiratoryRate={record.respiratoryRate}
                bloodPressure={record.bloodPressure}
                symptoms={record.symptoms}
                timestamp={record.timestamp}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
