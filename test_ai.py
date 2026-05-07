import requests
import json

url = "http://localhost:5000/ai-recommendations"
data = {
    "primary_type": "Tritanopi (Mavi-Sari Korlugu)",
    "secondary_type": None,
    "confidence": 85.5
}

print("Test istegi gonderiliyor...")
response = requests.post(url, json=data, timeout=15)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print("BASARILI!")
    print(f"AI Generated: {result.get('ai_generated', False)}")
    print(json.dumps(result, indent=2, ensure_ascii=False))
else:
    print(f"HATA: {response.text}")

