import requests

BASE_URL = "http://localhost:3000/api/triage"
# BASE_URL = "https://hack-canada2026-dashboard.vercel.app/api/triage"

x={
        "seatNumber": 12,
        "heartRate": 90,
        "respiratoryRate": 25,
        "bloodPressure": "140/95",
        "symptoms": "Burned hand on stove",
        "healthCardNumber": "1223-ED",
        "timeOffset": -5,
    }
y={
    "seatNumber": 7,
    "heartRate": 90,
    "respiratoryRate": 20,
    "bloodPressure": "130/90",
    "symptoms": "Paper cut on hand",
    "healthCardNumber": "1221-ED",
    "timeOffset": -9,
}

a={
        "seatNumber": 4,
        "heartRate": 95,
        "respiratoryRate": 15,
        "bloodPressure": "131/92",
        "symptoms": "hit head yesterday, theres a bit of a bump on my head",
        "healthCardNumber": "6561-964-179-ED",
        "timeOffset": 0,
    }
b={
        "seatNumber": 4,
        "heartRate": 100,
        "respiratoryRate": 18,
        "bloodPressure": "135/92",
        "symptoms": "now throwing up. very dizzy. hurts a lot.",
        "healthCardNumber": "6561-964-179-ED",
        "timeOffset": 0,
    }
res = requests.post(BASE_URL, json=x)