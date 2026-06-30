import asyncio
import os
import sys
from dotenv import load_dotenv
load_dotenv()

from server.agents import execute_adk_verification

async def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "microsoft"
    
    cases = {
        "microsoft": {
            "company_name": "Microsoft Corporation",
            "website": "microsoft.com",
            "country": "United States",
            "industry": "Technology"
        },
        "boeing": {
            "company_name": "Boeing",
            "website": "boeing.com",
            "country": "United States",
            "industry": "Aerospace"
        },
        "babylon": {
            "company_name": "Babylon Health",
            "website": "babylonhealth.com",
            "country": "United Kingdom",
            "industry": "Medical AI & Healthcare Services"
        }
    }
    
    if target not in cases:
        print(f"Unknown target: {target}. Available options: {list(cases.keys())}")
        return

    case = cases[target]
    print(f"\n==========================================")
    print(f"Executing verification pipeline for: {case['company_name']}")
    print(f"==========================================\n")
    
    try:
        res = await execute_adk_verification(
            company_name=case["company_name"],
            website=case["website"],
            country=case["country"],
            industry=case["industry"],
            screened_by="Test Harness"
        )
        print("\n--- RESULTS ---")
        print(f"Company: {res['companyName']}")
        print(f"Rating: {res['riskRating']}")
        print(f"Overall Score: {res['riskScore']}")
        print(f"Executive Summary: {res['executiveSummary']}")
        print(f"Recommendation: {res['recommendation']}")
        print("\n--- Agent Scores & Statuses ---")
        for agent_id, result in res["agentResults"].items():
            print(f"- {result['agentName']}: {result['score']}% ({result['status']}) -> {result['outputMessage']}")
    except Exception as e:
        import traceback
        print("Error encountered:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
