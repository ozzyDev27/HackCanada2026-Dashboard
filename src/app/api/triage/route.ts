import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addRecord, deleteRecord, getRecords, setHealthCardSummary, setRiskLevel, setSymptomSummary, updatePriorities } from "@/lib/store";
import healthCards from "@/lib/healthcards.json";

// Single Gemini call that returns riskLevel + symptomSummary + healthCardSummary in one shot
async function analyzePatient(
  id: string,
  record: { seatNumber: string | number; heartRate?: number; respiratoryRate?: number; bloodPressure?: string; symptoms?: string },
  patientInfo?: { allergies: string[]; conditions: string[]; medications: string[] }
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const patientData = {
    heartRate: record.heartRate ?? "N/A",
    respiratoryRate: record.respiratoryRate ?? "N/A",
    bloodPressure: record.bloodPressure ?? "N/A",
    symptoms: record.symptoms ?? "none reported",
  };

  const healthCardSection = patientInfo
    ? `Allergies: ${patientInfo.allergies.join(", ") || "none"}
Conditions: ${patientInfo.conditions.join(", ") || "none"}
Medications: ${patientInfo.medications.join(", ") || "none"}`
    : null;

  const prompt = `You are a medical triage AI. Analyze this patient and respond with ONLY a valid JSON object — no markdown, no explanation.

Patient vitals and symptoms:
${JSON.stringify(patientData, null, 2)}
${healthCardSection ? `\nHealth card:\n${healthCardSection}` : ""}

Return exactly this JSON shape:
{
  "riskLevel": "red" | "yellow" | "green",
  "symptomSummary": "Patient has ... (plain English, under 20 words, or null if no symptoms)",
  "healthCardSummary": "One sentence highlighting allergies/conditions/medications relevant to emergency care, under 20 words, or null if no health card"
}

Rules:
- riskLevel: red = immediate threat, yellow = urgent but stable, green = non-urgent. N/A vitals are not dangerous on their own.
- symptomSummary: start with "Patient has", plain English, no jargon.
- healthCardSummary: null if no health card data provided.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid JSON");

  const parsed = JSON.parse(match[0]);

  if (["red", "yellow", "green"].includes(parsed.riskLevel)) {
    setRiskLevel(id, parsed.riskLevel);
  }
  if (parsed.symptomSummary) {
    setSymptomSummary(id, parsed.symptomSummary);
  }
  if (parsed.healthCardSummary) {
    setHealthCardSummary(id, parsed.healthCardSummary);
  }
}

async function rerankPatients() {
  const records = getRecords();
  if (records.length === 0) return;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const patientSummaries = records.map((r) => ({
    id: r.id,
    seatNumber: r.seatNumber,
    heartRate: r.heartRate ?? "N/A",
    respiratoryRate: r.respiratoryRate ?? "N/A",
    bloodPressure: r.bloodPressure ?? "N/A",
    symptoms: r.symptoms || "none reported",
  }));

  const prompt = `You are a medical triage AI. Given the following list of patients, rank them from highest to lowest clinical priority (most critical patient first). Use all available data: vital signs and reported symptoms. A patient with chest tightness, difficulty breathing, or dangerously abnormal vitals should rank above someone with a minor injury.

Patients:
${JSON.stringify(patientSummaries, null, 2)}

Respond with ONLY a valid JSON array of patient IDs in order from highest to lowest priority. No explanation, no markdown, just the array. Example: ["id1", "id2", "id3"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Gemini response did not contain a valid JSON array");

  const rankedIds: string[] = JSON.parse(match[0]);
  updatePriorities(rankedIds);
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

    const newRecord = addRecord({
      seatNumber: body.seatNumber.toString(),
      heartRate: body.heartRate ? Number(body.heartRate) : undefined,
      respiratoryRate: body.respiratoryRate ? Number(body.respiratoryRate) : undefined,
      bloodPressure: body.bloodPressure ? body.bloodPressure.toString() : undefined,
      symptoms: body.symptoms ? body.symptoms.toString() : undefined,
      healthCardNumber,
      patientInfo,
    });

    // Single combined Gemini call for per-patient analysis, plus re-ranking — both in background
    analyzePatient(newRecord.id, newRecord, patientInfo).catch((err) =>
      console.error("Gemini patient analysis failed:", err)
    );
    rerankPatients().catch((err) =>
      console.error("Gemini re-ranking failed:", err)
    );

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error) {
    console.error("Error processing triage POST:", error);
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
    console.error("Error processing triage DELETE:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
