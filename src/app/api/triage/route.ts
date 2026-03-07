import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addRecord, deleteRecord, getRecords, setRiskLevel, updatePriorities } from "@/lib/store";
import healthCards from "@/lib/healthcards.json";

async function assessRisk(id: string, record: { seatNumber: string | number; heartRate: number; respiratoryRate: number; bloodPressure: string; symptoms?: string }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a medical triage AI. Assess the risk level of a single patient based on their vitals and symptoms.

Patient:
${JSON.stringify(record, null, 2)}

Classify the patient as exactly one of:
- "red": immediate life threat, requires urgent intervention (e.g. not breathing, cardiac arrest, severe chest pain, critically abnormal vitals)
- "yellow": urgent but not immediately life-threatening (e.g. moderate pain, mildly abnormal vitals, concerning symptoms)
- "green": non-urgent, minor condition (e.g. small cuts, mild discomfort, normal vitals)

Respond with ONLY one word: red, yellow, or green. No punctuation, no explanation.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().toLowerCase();
  const level = ["red", "yellow", "green"].includes(text) ? (text as "red" | "yellow" | "green") : "yellow";
  setRiskLevel(id, level);
}

async function rerankPatients() {
  const records = getRecords();
  if (records.length === 0) return;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const patientSummaries = records.map((r) => ({
    id: r.id,
    seatNumber: r.seatNumber,
    heartRate: r.heartRate,
    respiratoryRate: r.respiratoryRate,
    bloodPressure: r.bloodPressure,
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

    if (!body.seatNumber || !body.heartRate || !body.respiratoryRate || !body.bloodPressure) {
      return NextResponse.json(
        { error: "mmm uh oh" },
        { status: 400 }
      );
    }

    const healthCardNumber = body.healthCardNumber ? String(body.healthCardNumber) : "";
    const patientInfo = healthCardNumber ? (healthCards.find((c) => c.healthCardNumber === healthCardNumber) ?? undefined) : undefined;

    const newRecord = addRecord({
      seatNumber: body.seatNumber.toString(),
      heartRate: Number(body.heartRate),
      respiratoryRate: Number(body.respiratoryRate),
      bloodPressure: body.bloodPressure.toString(),
      symptoms: body.symptoms ? body.symptoms.toString() : undefined,
      healthCardNumber,
      patientInfo,
    });

    // Assess risk and re-rank all patients with Gemini in the background
    assessRisk(newRecord.id, newRecord).catch((err) =>
      console.error("Gemini risk assessment failed:", err)
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
