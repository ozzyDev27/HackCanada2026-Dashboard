import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";

// Load .env.local manually
const env = readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

console.log(`✅ API key loaded (${apiKey.slice(0, 8)}...)\n`);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

console.log("🔬 Test 1: Risk assessment for a critical patient...");
const patient = {
  seatNumber: "A1",
  heartRate: 10,
  respiratoryRate: 1,
  bloodPressure: "60/40",
  symptoms: "not breathing, unresponsive",
};

const riskPrompt = `You are a medical triage AI. Assess the risk level of a single patient based on their vitals and symptoms.

Patient:
${JSON.stringify(patient, null, 2)}

Classify the patient as exactly one of:
- "red": immediate life threat, requires urgent intervention
- "yellow": urgent but not immediately life-threatening
- "green": non-urgent, minor condition

Respond with ONLY one word: red, yellow, or green. No punctuation, no explanation.`;

const riskResult = await model.generateContent(riskPrompt);
const riskText = riskResult.response.text().trim().toLowerCase();
console.log(`   Response: "${riskText}"`);
console.log(`   ${["red", "yellow", "green"].includes(riskText) ? "✅ Valid risk level" : "❌ Unexpected response"}\n`);

// --- Test 2: Priority ranking ---
console.log("🔬 Test 2: Priority ranking for multiple patients...");
const patients = [
  { id: "aaa", seatNumber: "B5", heartRate: 72, respiratoryRate: 16, bloodPressure: "120/80", symptoms: "papercut on finger" },
  { id: "bbb", seatNumber: "C3", heartRate: 10, respiratoryRate: 1, bloodPressure: "60/40", symptoms: "not breathing, unresponsive" },
  { id: "ccc", seatNumber: "D9", heartRate: 95, respiratoryRate: 22, bloodPressure: "150/95", symptoms: "chest tightness, short of breath" },
];

const rankPrompt = `You are a medical triage AI. Rank these patients from highest to lowest clinical priority.

Patients:
${JSON.stringify(patients, null, 2)}

Respond with ONLY a valid JSON array of patient IDs in order from highest to lowest priority. Example: ["id1", "id2", "id3"]`;

const rankResult = await model.generateContent(rankPrompt);
const rankText = rankResult.response.text().trim();
console.log(`   Response: ${rankText}`);
const match = rankText.match(/\[[\s\S]*\]/);
if (match) {
  const ranked = JSON.parse(match[0]);
  const isCorrect = ranked[0] === "bbb";
  console.log(`   Ranked: ${ranked.join(" → ")}`);
  console.log(`   ${isCorrect ? "✅ Most critical patient ranked first" : "⚠️  Unexpected ranking order"}\n`);
} else {
  console.log("   ❌ Could not parse JSON array from response\n");
}

console.log("Done.");
