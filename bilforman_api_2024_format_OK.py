import requests
import uuid
import json

# Konfigurationsvariabler från Skatteverket (Komplett testtjänst)
CLIENT_ID = "361f5e9b75dcc0875080b65628ce0023e9bb24cd7902dc67"
CLIENT_SECRET = "aaedd9a768031bea5bc12fd7885bc645ad2e938d03870023e9bb24cd7902dc67"
API_GW_CLIENT_ID = "864bc863-a50e-4f7a-8ec2-2bc818a771ec"
API_GW_CLIENT_SECRET = "33b53d0c-8c8b-4672-9ef0-eff090287524"
SCOPE = "bilforman"
TOKEN_URL = "https://sysoauth2.test.skatteverket.se/oauth2/v1/sys/token"
API_URL = "https://api.test.skatteverket.se/beskattning/bilforman/v2/berakna"

payload = {
    "berakningsunderlag": [
        {
            "beskattningsar": 2024,
            "extrautrustning": 65000,
            "tillverkningsar": 2020,
            "forstaPastallningsdatum": "2020-01-01",
            "beraknatNybilspris": 620000,
            "drivmedelBeraknatNybilspris": "El/Bensin",
            "antalMilTjanstekorningPerAr": 3000,
            "miljobilsreducering": True
        }
    ]
}

try:
    token_response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope": SCOPE
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )
except Exception as e:
    print(f"❌ Fel vid anslutning till OAuth2-token-tjänsten:\n{e}")
    exit(1)

if token_response.status_code != 200:
    print("❌ Misslyckades med att hämta token")
    print(f"Statuskod: {token_response.status_code}")
    print(f"Svar: {token_response.text}")
    exit(1)

token_data = token_response.json()
access_token = token_data.get("access_token")
if not access_token:
    print("❌ Kunde inte hitta access_token i svaret från token-tjänsten.")
    exit(1)

headers = {
    "Authorization": f"Bearer {access_token}",
    "Client_Id": API_GW_CLIENT_ID,
    "Client_Secret": API_GW_CLIENT_SECRET,
    "skv_client_correlation_id": str(uuid.uuid4()),
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    response = requests.post(API_URL, headers=headers, json=payload)
except Exception as e:
    print(f"❌ Fel vid anrop till bilförmåns-API:\n{e}")
    exit(1)

if response.status_code == 200:
    try:
        result = response.json()
        if isinstance(result, dict) and "bilformansvarden" in result:
            for i, item in enumerate(result["bilformansvarden"], start=1):
                print(f"\n✅ Bilförmånsberäkning #{i}")
                print(f"Årskostnad: {item.get('arskostnad', 'saknas')} kr")
                print(f"Månadskostnad: {item.get('manadskostnad', 'saknas')} kr")
                print("📋 Specifikation:")
                spec = item.get("specifikation", {})
                for key, value in spec.items():
                    print(f" - {key}: {value}")
        else:
            print("⚠️ Ovänat svar från API:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except ValueError:
        print("Kunde inte tolka svaret som JSON:")
        print(response.text)
else:
    print(f"❌ Bilförmåns-API-anrop misslyckades. Statuskod: {response.status_code}")
    print(response.text)
