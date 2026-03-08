import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addRecord, deleteRecord, getRecords, setHealthCardSummary, setRiskLevel, setSymptomSummary, updatePriorities, upsertRecord } from "@/lib/store";
import healthCards from "@/lib/healthcards.json";

async function analyzeAndRank(
  newId: string,
  newRecord: { seatNumber: string | number; heartRate?: number; respiratoryRate?: number; bloodPressure?: string; symptoms?: string },
  patientInfo?: { allergies: string[]; conditions: string[]; medications: string[] },
  previousSymptoms?: string
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const allRecords = getRecords();

  const newPatientData = {
    heartRate: newRecord.heartRate ?? "N/A",
    respiratoryRate: newRecord.respiratoryRate ?? "N/A",
    bloodPressure: newRecord.bloodPressure ?? "N/A",
    symptoms: newRecord.symptoms ?? "none reported",
  };

  const healthCardSection = patientInfo
    ? `Allergies: ${patientInfo.allergies.join(", ") || "none"}
Conditions: ${patientInfo.conditions.join(", ") || "none"}
Medications: ${patientInfo.medications.join(", ") || "none"}`
    : null;

  const otherPatients = allRecords
    .filter((r) => r.id !== newId)
    .map((r) => ({
      id: r.id,
      heartRate: r.heartRate ?? "N/A",
      respiratoryRate: r.respiratoryRate ?? "N/A",
      bloodPressure: r.bloodPressure ?? "N/A",
      symptoms: r.symptoms || "none reported",
    }));

  const prompt = `Triage nurse. JSON only.

New patient id="${newId}": ${JSON.stringify(newPatientData)}
${healthCardSection ? `Health card: ${healthCardSection}` : ""}
${previousSymptoms ? `Previous: ${previousSymptoms}` : ""}

All patients: ${JSON.stringify([{ id: newId, ...newPatientData }, ...otherPatients])}

Return: {"riskLevel":"red"|"yellow"|"green","symptomSummary":"<bare phrase, no vitals, e.g. chest tightness>","healthCardSummary":"<natural sentence or null>","rankedIds":["<highest priority id>",...]}
red=immediate threat, yellow=urgent, green=minor. N/A vitals alone are not dangerous. rankedIds must include ALL patient ids.`;

  console.log(`[AI] ⏳ Sending request to Gemini for seat ${newRecord.seatNumber} (${allRecords.length} total patients)...`);
  const t0 = Date.now();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  console.log(`[AI] ✅ Gemini responded in ${Date.now() - t0}ms`);

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("bad response");
  const parsed = JSON.parse(match[0]);

  console.log(`[AI] risk=${parsed.riskLevel} | summary="${parsed.symptomSummary}" | ranked=${JSON.stringify(parsed.rankedIds)}`);

  if (["red", "yellow", "green"].includes(parsed.riskLevel)) setRiskLevel(newId, parsed.riskLevel);
  if (parsed.symptomSummary) setSymptomSummary(newId, parsed.symptomSummary);
  if (parsed.healthCardSummary) setHealthCardSummary(newId, parsed.healthCardSummary);
  if (Array.isArray(parsed.rankedIds) && parsed.rankedIds.length > 0) updatePriorities(parsed.rankedIds);

  console.log(`[AI] ✔ Store updated for seat ${newRecord.seatNumber}`);
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

    analyzeAndRank(newRecord.id, newRecord, patientInfo, previousSymptoms).catch(console.error);

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
