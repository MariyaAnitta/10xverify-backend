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
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1.5px solid #111827;
                padding-bottom: 5px;
                margin-bottom: 15px;
                letter-spacing: 0.5px;
                color: #111827;
            }}
            .grid {{
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
            }}
            .card {{
                background: #F9FAFB;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                padding: 15px;
            }}
            .kv-pair {{
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                border-bottom: 1px dashed #E5E7EB;
                padding-bottom: 4px;
            }}
            .kv-pair:last-child {{
                border-bottom: none;
            }}
            .kv-label {{
                font-size: 9px;
                font-weight: bold;
                color: #6B7280;
                text-transform: uppercase;
            }}
            .kv-value {{
                font-size: 11px;
                font-weight: 600;
                color: #111827;
                text-align: right;
                max-width: 60%;
                word-wrap: break-word;
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
            <p style="font-weight: 500; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">{dossier.get('executiveSummary')}</p>
            <div style="background: #FEF2F2; padding: 12px; border-left: 4px solid #EF4444; border-radius: 4px;">
                <strong style="font-size: 12px; color: #991B1B;">Primary Directive:</strong><br>
                <span style="font-size: 12px; color: #7F1D1D; font-weight: 550;">{dossier.get('recommendation')}</span>
            </div>
        </div>
        
        <div class="grid section">
            <!-- Box 1: Legal Incorporations -->
            <div class="card">
                <div class="section-title">Legal Incorporations</div>
                <div class="kv-pair"><div class="kv-label">Reg Number</div><div class="kv-value">{details.get('registrationNumber')}</div></div>
                <div class="kv-pair"><div class="kv-label">Incorporated</div><div class="kv-value">{details.get('incorporationDate')}</div></div>
                <div class="kv-pair"><div class="kv-label">Legal Status</div><div class="kv-value">{details.get('legalStatus')}</div></div>
                <div class="kv-pair"><div class="kv-label">Industry Type</div><div class="kv-value">{details.get('typeOfBusiness') or dossier.get('industry')}</div></div>
                <div class="kv-pair"><div class="kv-label">Directors</div><div class="kv-value" style="font-size: 10px;">{", ".join(details.get('directors', [])) if isinstance(details.get('directors'), list) else details.get('directors')}</div></div>
                <div class="kv-pair"><div class="kv-label">Shareholders & UBOS</div><div class="kv-value" style="font-size: 10px;">{", ".join(details.get('shareholders', [])) if isinstance(details.get('shareholders'), list) else details.get('shareholders')}</div></div>
            </div>
            
            <!-- Box 2: Physical & Digital Audit -->
            <div class="card">
                <div class="section-title">Physical & Digital Audit</div>
                <div class="kv-pair"><div class="kv-label">Registered Office</div><div class="kv-value" style="font-size: 10px;">{details.get('registeredAddress')}</div></div>
                <div class="kv-pair"><div class="kv-label">Map Validation</div><div class="kv-value" style="font-size: 10px;">{details.get('validatedAddress')}</div></div>
                <div class="kv-pair"><div class="kv-label">Domain Age</div><div class="kv-value">{f"{details.get('domainAgeDays')} Days (~{details.get('domainAgeDays') // 365} years)" if isinstance(details.get('domainAgeDays'), int) else details.get('domainAgeDays')}</div></div>
                <div class="kv-pair"><div class="kv-label">Domain Registrar</div><div class="kv-value">{details.get('domainRegistrar')}</div></div>
                <div class="kv-pair"><div class="kv-label">SSL Security</div><div class="kv-value" style="color: {'#10B981' if details.get('sslSecure') else '#EF4444'};">{'SECURE (SSL)' if details.get('sslSecure') else 'UNENCRYPTED'}</div></div>
            </div>

            <!-- Box 3: Compliance Checklists -->
            <div class="card">
                <div class="section-title">Compliance Checklists</div>
                <div class="kv-pair"><div class="kv-label">Solvency Index</div><div class="kv-value" style="color: {'#10B981' if details.get('solvencyStatus') == 'Solvent' else '#EF4444'};">{details.get('solvencyStatus')}</div></div>
                <div class="kv-pair"><div class="kv-label">Credit Tier Est</div><div class="kv-value">{details.get('creditScoreEst')}</div></div>
                <div class="kv-pair"><div class="kv-label">Sanctions SDN Status</div><div class="kv-value" style="color: {'#10B981' if details.get('sanctionsRisk') == 'None' else '#EF4444'};">{details.get('sanctionsRisk')}</div></div>
                <div class="kv-pair"><div class="kv-label">Adverse Press Found</div><div class="kv-value" style="color: {'#EF4444' if details.get('adverseMediaFound') else '#10B981'};">{'FOUND' if details.get('adverseMediaFound') else 'NONE'}</div></div>
                <div class="kv-pair"><div class="kv-label">Licenses Audited</div><div class="kv-value" style="font-size: 10px;">{", ".join(details.get('complianceLicenses', [])) if isinstance(details.get('complianceLicenses'), list) else details.get('complianceLicenses')}</div></div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Agents Execution Findings (Expanded)</div>
    """
    
    for agent_key, agent in agent_results.items():
        score = agent.get("score", 0)
        try:
            score_num = int(score)
        except (ValueError, TypeError):
            score_num = 0
        score_color = "#10B981" if score_num >= 80 else "#F59E0B" if score_num >= 60 else "#EF4444"
        
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
