import sys
import os
sys.path.append(os.getcwd())

import asyncio
from dotenv import load_dotenv
load_dotenv()

from server.agents import financial_agent, run_agent, parse_json_block

async def main():
    input_message = 'Verify company "Babylon Health" with website "babylonhealth.com" in country "United Kingdom" under industry "Medical AI & Healthcare Services".'
    # Use dummy corporate details indicating bankruptcy to see how the agent responds
    corp_details = '{"registrationNumber": "03496626", "legalStatus": "Active/In Administration", "registeredAddress": "192 Drummond Street, London"}'
    prompt = f"{input_message} Corporate details: {corp_details}."
    
    print("Querying Financial Agent...")
    raw = await run_agent(financial_agent, prompt)
    print("\n--- RAW RESPONSE ---")
    print(raw)
    print("\n--- PARSED OBJ ---")
    print(parse_json_block(raw))

if __name__ == "__main__":
    asyncio.run(main())
