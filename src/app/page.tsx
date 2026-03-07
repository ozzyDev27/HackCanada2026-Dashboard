"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TriageCard from "@/components/TriageCard";

interface PatientInfo {
  healthCardNumber: string;
  name: string;
  dob: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

interface TriageRecord {
  id: string;
  seatNumber: number;
  heartRate: number;
  respiratoryRate: number;
  bloodPressure: string;
  symptoms?: string;
  symptomSummary?: string;
  healthCardSummary?: string;
  timestamp: string;
  priorityRank?: number;
  riskLevel?: "red" | "yellow" | "green";
  patientInfo?: PatientInfo;
}

export default function Home() {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState("");
  const [filters, setFilters] = useState({ red: true, yellow: true, green: true });
  const dismissedIds = useRef<Set<string>>(new Set());

  const dismissRecord = async (id: string) => {
    dismissedIds.current.add(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/triage?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete triage record:", err);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/triage");
      const data = await res.json();
      if (data.records) {
        setRecords(data.records.filter((r: TriageRecord) => !dismissedIds.current.has(r.id)));
      }
    } catch (err) {
      console.error("Failed to fetch triage records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const pollId = setInterval(fetchRecords, 5000);
    return () => clearInterval(pollId);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleFilter = (key: "red" | "yellow" | "green") =>
    setFilters((f) => ({ ...f, [key]: !f[key] }));

  const sorted = [...records]
    .sort((a, b) => {
      if (a.priorityRank === undefined && b.priorityRank === undefined) return 0;
      if (a.priorityRank === undefined) return 1;
      if (b.priorityRank === undefined) return -1;
      return a.priorityRank - b.priorityRank;
    })
    .filter((r) => {
      if (r.riskLevel === "red") return filters.red;
      if (r.riskLevel === "yellow") return filters.yellow;
      if (r.riskLevel === "green") return filters.green;
      return true; // pending always shown
    });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="text-sm text-zinc-400 leading-snug">
          <p>space save</p>
          <p>for logo</p>
        </div>

        <p className="text-6xl font-bold tracking-tight">{clock}</p>

        <div className="flex flex-col gap-1.5 text-sm font-semibold">
          <label className="flex cursor-pointer items-center justify-end gap-2">
            <span style={{ color: "var(--filter-green)" }}>Low risk</span>
            <input
              type="checkbox"
              checked={filters.green}
              onChange={() => toggleFilter("green")}
              className="h-4 w-4"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-end gap-2">
            <span style={{ color: "var(--filter-yellow)" }}>Moderate danger</span>
            <input
              type="checkbox"
              checked={filters.yellow}
              onChange={() => toggleFilter("yellow")}
              className="h-4 w-4"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-end gap-2">
            <span style={{ color: "var(--filter-red)" }}>Urgent Care</span>
            <input
              type="checkbox"
              checked={filters.red}
              onChange={() => toggleFilter("red")}
              className="h-4 w-4"
            />
          </label>
        </div>
      </header>

      {/* Purple separator */}
      <div className="h-1" style={{ backgroundColor: "var(--header-separator)" }} />

      {/* Cards */}
      <main className="px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-white" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
            <p className="text-lg font-medium">No patients waiting</p>
            <p className="mt-1 text-sm">New triage records will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" style={{ gridAutoRows: "460px" }}>
            <AnimatePresence mode="popLayout">
              {sorted.map((record) => (
                <motion.div
                  key={record.id}
                  layout
                  className="h-full"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <TriageCard
                    key={record.id}
                    id={record.id}
                    seatNumber={record.seatNumber}
                    heartRate={record.heartRate}
                    respiratoryRate={record.respiratoryRate}
                    bloodPressure={record.bloodPressure}
                    symptoms={record.symptoms}
                    symptomSummary={record.symptomSummary}
                    healthCardSummary={record.healthCardSummary}
                    timestamp={record.timestamp}
                    priorityRank={record.priorityRank}
                    riskLevel={record.riskLevel}
                    patientInfo={record.patientInfo}
                    onDismiss={() => dismissRecord(record.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}


