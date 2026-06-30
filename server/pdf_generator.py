import json

def generate_dossier_html(dossier: dict) -> str:
    details = dossier.get("details", {})
    agent_results = dossier.get("agentResults", {})
    
    # Determine colors
    rating = dossier.get("riskRating", "UNKNOWN")
    if rating == "GREEN":
        color = "#10B981"
    elif rating == "AMBER":
        color = "#F59E0B"
    elif rating == "RED":
        color = "#EF4444"
    else:
        color = "#111827" # BLACK
        
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #374151;
                margin: 40px;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #E5E7EB;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
            }}
            .score-box {{
                background-color: {color};
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                text-align: center;
                font-weight: bold;
            }}
            .section {{
                margin-bottom: 30px;
            }}
            .section-title {{
                font-size: 18px;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #D1D5DB;
                padding-bottom: 5px;
                margin-bottom: 15px;
                letter-spacing: 1px;
            }}
            .grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }}
            .card {{
                background: #F9FAFB;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                padding: 15px;
            }}
            .kv-pair {{
                margin-bottom: 8px;
            }}
            .kv-label {{
                font-size: 12px;
                font-weight: bold;
                color: #6B7280;
                text-transform: uppercase;
            }}
            .kv-value {{
                font-size: 14px;
                font-weight: 500;
            }}
            .agent-box {{
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                margin-bottom: 15px;
            }}
            .agent-header {{
                background: #F3F4F6;
                padding: 10px 15px;
                font-weight: bold;
                border-bottom: 1px solid #E5E7EB;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                display: flex;
                justify-content: space-between;
            }}
            .agent-body {{
                padding: 15px;
                background: white;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="title">10xVerify AI Dossier: {dossier.get('companyName')}</div>
                <div style="color: #6B7280; margin-top: 5px;">Screened: {dossier.get('screenedAt')[:10]} | Website: {dossier.get('website')}</div>
            </div>
            <div class="score-box">
                <div style="font-size: 24px;">{dossier.get('riskScore')}%</div>
                <div style="font-size: 12px; text-transform: uppercase;">{rating} RISK</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Executive Risk Summary</div>
            <p style="font-weight: 500;">{dossier.get('executiveSummary')}</p>
            <div style="background: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin-top: 15px;">
                <strong>Primary Directive:</strong><br>
                {dossier.get('recommendation')}
            </div>
        </div>
        
        <div class="grid section">
            <div class="card">
                <div class="section-title" style="border: none;">Corporate & Legal</div>
                <div class="kv-pair"><div class="kv-label">Registration Number</div><div class="kv-value">{details.get('registrationNumber')}</div></div>
                <div class="kv-pair"><div class="kv-label">Incorporated</div><div class="kv-value">{details.get('incorporationDate')}</div></div>
                <div class="kv-pair"><div class="kv-label">Legal Status</div><div class="kv-value">{details.get('legalStatus')}</div></div>
            </div>
            
            <div class="card">
                <div class="section-title" style="border: none;">Compliance & Risk</div>
                <div class="kv-pair"><div class="kv-label">Sanctions / SDN Status</div><div class="kv-value">{details.get('sanctionsRisk')}</div></div>
                <div class="kv-pair"><div class="kv-label">Financial Solvency</div><div class="kv-value">{details.get('solvencyStatus')}</div></div>
                <div class="kv-pair"><div class="kv-label">Adverse Press</div><div class="kv-value">{'Yes' if details.get('adverseMediaFound') else 'No'}</div></div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Agents Execution Findings (Expanded)</div>
    """
    
    for agent_key, agent in agent_results.items():
        score = agent.get("score", 0)
        score_color = "#10B981" if score >= 80 else "#F59E0B" if score >= 60 else "#EF4444"
        
        html += f"""
        <div class="agent-box">
            <div class="agent-header">
                <div>{agent.get("agentName")}</div>
                <div style="color: {score_color};">Score: {score}%</div>
            </div>
            <div class="agent-body">
                <div class="kv-pair">
                    <div class="kv-label">Core Finding</div>
                    <div class="kv-value">{agent.get("outputMessage")}</div>
                </div>
                <div class="kv-pair" style="margin-top: 10px;">
                    <div class="kv-label">Evidence Traces</div>
                    <div class="kv-value" style="font-family: monospace; color: #4B5563;">
                        - {', '.join(agent.get('evidence', []))}<br>
                        - {', '.join(agent.get('keyFindings', []))}
                    </div>
                </div>
            </div>
        </div>
        """
        
    html += """
        </div>
    </body>
    </html>
    """
    
    return html
