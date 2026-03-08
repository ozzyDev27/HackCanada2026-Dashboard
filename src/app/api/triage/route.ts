import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addRecord, deleteRecord, getRecords, setHealthCardSummary, setRiskLevel, setSymptomSummary, updatePriorities, upsertRecord } from "@/lib/store";
import healthCards from "@/lib/healthcards.json";

async function classifyPatient(
  id: string,
  record: { seatNumber: string | number; heartRate?: number; respiratoryRate?: number; bloodPressure?: string; symptoms?: string },
  patientInfo?: { allergies: string[]; conditions: string[]; medications: string[] },
  previousSymptoms?: string
) {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: "gemini-2.5-flash" });

  const vitals = {
    heartRate: record.heartRate ?? "N/A",
    respiratoryRate: record.respiratoryRate ?? "N/A",
    bloodPressure: record.bloodPressure ?? "N/A",
    symptoms: record.symptoms ?? "none reported",
  };
  const hc = patientInfo
    ? `Allergies: ${patientInfo.allergies.join(", ") || "none"}, Conditions: ${patientInfo.conditions.join(", ") || "none"}, Medications: ${patientInfo.medications.join(", ") || "none"}`
    : null;

  const prompt = `Triage nurse. JSON only. Single patient.
Vitals: ${JSON.stringify(vitals)}${hc ? `\nHealth card: ${hc}` : ""}${previousSymptoms ? `\nPrevious: ${previousSymptoms}` : ""}
Return: {"riskLevel":"red"|"yellow"|"green","symptomSummary":"<bare symptom phrase, no vitals>","healthCardSummary":"<natural sentence or null>"}
red=immediate threat, yellow=urgent, green=minor.`;

  console.log(`[AI] classify seat ${record.seatNumber}...`);
  const t0 = Date.now();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as never,
  });
  console.log(`[AI] classify done in ${Date.now() - t0}ms`);

  const match = result.response.text().match(/\{[\s\S]*\}/);
  if (!match) throw new Error("bad response");
  const parsed = JSON.parse(match[0]);

  if (["red", "yellow", "green"].includes(parsed.riskLevel)) setRiskLevel(id, parsed.riskLevel);
  if (parsed.symptomSummary) setSymptomSummary(id, parsed.symptomSummary);
  if (parsed.healthCardSummary) setHealthCardSummary(id, parsed.healthCardSummary);
}

async function rankPatients() {
  const all = getRecords();
  if (all.length < 2) return;

  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: "gemini-2.5-flash" });

  const patients = all.map((r) => ({
    id: r.id,
    heartRate: r.heartRate ?? "N/A",
    respiratoryRate: r.respiratoryRate ?? "N/A",
    bloodPressure: r.bloodPressure ?? "N/A",
    symptoms: r.symptoms || "none",
    riskLevel: r.riskLevel ?? "unknown",
  }));

  const prompt = `Triage nurse. Return ONLY a JSON array of patient IDs ordered highest to lowest priority.
Patients: ${JSON.stringify(patients)}
Return: ["id1","id2",...]`;

  console.log(`[AI] rank ${all.length} patients...`);
  const t0 = Date.now();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as never,
  });
  console.log(`[AI] rank done in ${Date.now() - t0}ms`);

  const match = result.response.text().match(/\[[\s\S]*\]/);
  if (!match) throw new Error("bad response");
  const rankedIds: string[] = JSON.parse(match[0]);
  if (Array.isArray(rankedIds) && rankedIds.length > 0) updatePriorities(rankedIds);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.seatNumber) {
      return NextResponse.json(
        { error: "mmm uh oh" },
        { status: 400 }
      );
    }

    const healthCardNumber = body.healthCardNumber ? String(body.healthCardNumber) : "";
    const patientInfo = healthCardNumber ? (healthCards.find((c) => c.healthCardNumber === healthCardNumber) ?? undefined) : undefined;

    const timeOffset: number = body.timeOffset ? Number(body.timeOffset) : 0;
    const timestamp = new Date(Date.now() + timeOffset * 60 * 1000).toISOString();

    const { record: newRecord, previousSymptoms } = upsertRecord({
      seatNumber: body.seatNumber.toString(),
      heartRate: body.heartRate ? Number(body.heartRate) : undefined,
      respiratoryRate: body.respiratoryRate ? Number(body.respiratoryRate) : undefined,
      bloodPressure: body.bloodPressure ? body.bloodPressure.toString() : undefined,
      symptoms: body.symptoms ? body.symptoms.toString() : undefined,
      healthCardNumber,
      patientInfo,
    }, timestamp);

    classifyPatient(newRecord.id, newRecord, patientInfo, previousSymptoms).then(() => rankPatients()).catch(console.error);

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ records: getRecords() });
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const removed = deleteRecord(id);
    if (!removed) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
