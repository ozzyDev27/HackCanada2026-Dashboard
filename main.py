import requests

BASE_URL = "http://localhost:3000/api/triage"

FILLER_PATIENTS = [
    {
        "seatNumber": 12,
        "heartRate": 90,
        "respiratoryRate": 25,
        "bloodPressure": "140/95",
        "symptoms": "chest is tight",
        "healthCardNumber": "1223-ED",
        "timeOffset": -5,
    },
    {
        "seatNumber": 7,
        "heartRate": 90,
        "respiratoryRate": 20,
        "bloodPressure": "130/90",
        "symptoms": "paper cut (ouchie)",
        "healthCardNumber": "1221-ED",
        "timeOffset": -9,
    },
]


for patient in FILLER_PATIENTS:
    res = requests.post(BASE_URL, json=patient)
    # print(f"Seat {patient['seatNumber']}: {res.status_code} {res.text}")