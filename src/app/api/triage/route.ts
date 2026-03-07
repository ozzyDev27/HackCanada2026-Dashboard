import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addRecord, deleteRecord, getRecords, setHealthCardSummary, setRiskLevel, setSymptomSummary, updatePriorities, upsertRecord } from "@/lib/store";
import healthCards from "@/lib/healthcards.json";

// One Gemini call: analyze the new patient AND rank all patients at the same time
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

  const prompt = `You are a triage nurse. Be brief. Respond with ONLY a valid JSON object — no markdown, no explanation.

New patient (id: "${newId}"):
${JSON.stringify(newPatientData, null, 2)}
${healthCardSection ? `\nHealth card:\n${healthCardSection}` : ""}
${previousSymptoms ? `\nPrevious note: "${previousSymptoms}"` : ""}

All current patients (including new):
${JSON.stringify([{ id: newId, ...newPatientData }, ...otherPatients], null, 2)}

Return exactly this JSON:
{
  "riskLevel": "red" | "yellow" | "green",
  "symptomSummary": "...",
  "healthCardSummary": "...or null",
  "rankedIds": ["id-highest-priority", "id-next", ...]
}

Rules:
- riskLevel: red = immediate threat, yellow = urgent but stable, green = non-urgent. N/A vitals are not dangerous on their own.
- symptomSummary: a short symptom phrase, NOT a full sentence. No subject, no "patient complains of", no "presents with". Just the symptom itself, e.g. "chest tightness", "painful paper cut", "difficulty breathing and dizziness". Combine with previous note if present. Do NOT mention vitals.
- healthCardSummary: write naturally, e.g. "Patient has asthma and is on metformin." or "Patient is allergic to penicillin." Do NOT use label prefixes like "Conditions:" or "Medications:". Null if nothing relevant or no health card.
- rankedIds: ALL patient IDs ordered from highest to lowest priority.`;

  console.log(`[AI] ⏳ Sending request to Gemini for seat ${newRecord.seatNumber} (${allRecords.length} total patients)...`);
  const t0 = Date.now();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  console.log(`[AI] ✅ Gemini responded in ${Date.now() - t0}ms`);

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid JSON");

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

    // Single Gemini call: analyze new patient + rank all in background
    analyzeAndRank(newRecord.id, newRecord, patientInfo, previousSymptoms).catch((err) =>
      console.error("Gemini analyze+rank failed:", err)
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
