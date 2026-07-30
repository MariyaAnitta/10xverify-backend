import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_whois():
    api_key = os.getenv("WHOISJSON_API_KEY")
    domain = "sinnad.com.bh"
    
    headers = {"Authorization": f"TOKEN={api_key}"}
    params = {"domain": domain}
    
    async with httpx.AsyncClient() as client:
        res_whois = await client.get("https://whoisjson.com/api/v1/whois", params=params, headers=headers)
        if res_whois.status_code == 200:
            data = res_whois.json()
            print("Keys:", list(data.keys()))
            print("created:", data.get("created"))
            print("whois:", list(data.get("whois", {}).keys()) if data.get("whois") else "No whois key")

if __name__ == "__main__":
    asyncio.run(test_whois())
