import { NextResponse } from "next/server";
import { addRecord, getRecords, VitalSigns } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.seatNumber || !body.heartRate || !body.respiratoryRate || !body.bloodPressure) {
      return NextResponse.json(
        { error: "Missing required vital signs (seatNumber, heartRate, respiratoryRate, bloodPressure)" },
        { status: 400 }
      );
    }

    const newRecord = addRecord({
      seatNumber: body.seatNumber.toString(),
      heartRate: Number(body.heartRate),
      respiratoryRate: Number(body.respiratoryRate),
      bloodPressure: body.bloodPressure.toString(),
      symptoms: body.symptoms ? body.symptoms.toString() : undefined,
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error) {
    console.error("Error processing triage POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  // Returns all records
  return NextResponse.json({ records: getRecords() });
}
