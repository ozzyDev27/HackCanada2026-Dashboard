import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { deleteRecord, getRecords, setHealthCardSummary, setPriorityScore, setRiskLevel, setSymptomSummary, updatePriorities, upsertRecord } from "@/lib/store";
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
Return: {"score":<1-10>,"symptomSummary":"<bare symptom phrase, no vitals>","healthCardSummary":"<natural sentence or null>"}
Score: 1=critical emergency, 10=completely trivial. 1-3=red, 4-6=yellow, 7-10=green.`;

  console.log(`[AI] classify seat ${record.seatNumber}...`);
  const t0 = Date.now();
  const result = await model.generateContent(prompt);
  console.log(`[AI] classify done in ${Date.now() - t0}ms`);

  const match = result.response.text().match(/\{[\s\S]*\}/);
  if (!match) throw new Error("bad response");
  const parsed = JSON.parse(match[0]);

  const score = Number(parsed.score);
  if (score >= 1 && score <= 10) {
    setPriorityScore(id, score);
    setRiskLevel(id, score <= 3 ? "red" : score <= 6 ? "yellow" : "green");
  }
  if (parsed.symptomSummary) setSymptomSummary(id, parsed.symptomSummary);
  if (parsed.healthCardSummary) setHealthCardSummary(id, parsed.healthCardSummary);
}

function rankPatients() {
  const fallback: Record<string, number> = { red: 3, yellow: 6, green: 9 };
  const all = getRecords();
  const ranked = [...all].sort((a, b) => {
    const pa = a.priorityScore ?? fallback[a.riskLevel ?? ""] ?? 10;
    const pb = b.priorityScore ?? fallback[b.riskLevel ?? ""] ?? 10;
    return pa - pb;
  });
  updatePriorities(ranked.map((r) => r.id));
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
