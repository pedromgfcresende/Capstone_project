"""Generate demo_competitor.csv from the XAnge competitor-analysis screenshot.

Subject (focal) company: Gradient Labs. Competitors are tiered by
'Competitive Potential' (1 = most serious ... 3 = adjacent). Transcribed from
the provided spreadsheet image.
"""

import csv
from pathlib import Path

HEADER = [
    "Competitive Potential", "Name", "Founded", "HQ", "Funding Status",
    "Funding Amount", "Top Investors", "Description", "Segment",
    "Primary Customer", "Notes/ Relevance",
]

ROWS = [
    ["", "Gradient Labs", "2023", "UK", "Seed + Series A (Redpoint, LocalGlobe, Puzzle)",
     "$16.6M (Seed-Series A)", "LocalGlobe, Redpoint",
     "AI agents for regulated financial services; SOP-driven automation across frontline, outbound, and back office",
     "FS-native platform", "Fintechs, Neobanks, Traditional FIs",
     "Purpose-built for regulated environments; full agentic execution, not just chat"],

    # ── Tier 1 — most serious competition ──
    ["1", "Custom-build (e.g. Gemini etc.)", "N/A", "", "", "", "",
     "DIY solutions using agentic toolkits of LLM providers",
     "Custom build / infra", "Enterprise",
     "Most serious competition, especially for large financial institutions"],
    ["1", "IBM (Watson)", "N/A", "USA", "Public", "", "",
     "AI tooling for enterprises & banks", "Custom build / infra", "Large FIs",
     "IBM (Watson / IBM Consulting + automation stack). Usually shows up when the buyer wants 'enterprise-grade + services-led implementation'"],
    ["1", "AWS (Bedrock, Lex)", "N/A", "USA", "Public", "", "",
     "AI infrastructure & primitives", "Custom build / infra", "Large FIs, enterprises",
     "AWS stack (Bedrock + Lex + Contact Center/Connect + partner tooling). Competes as the 'build it on AWS' option, especially for larger institutions"],

    # ── Tier 2 — horizontal support platforms ──
    ["2", "Sierra", "2023", "USA", "Series C", "$635M (Series C)",
     "Sequoia Capital, Benchmark, Greenoaks, Softbank, VisionBank",
     "Horizontal AI agents for enterprise customer support",
     "Horizontal support platform", "Enterprise (cross-vertical)",
     "Competes in bake-offs; lacks FS-specific guardrails"],
    ["2", "Parloa", "2018", "Germany", "Series D", "$562M (Series D)",
     "EQT Ventures, Altimeter Capital, Durable Capital, General Catalyst",
     "Conversational AI for contact centers", "Horizontal support platform", "Enterprise",
     "Voice-strong; FS compliance not core"],
    ["2", "Decagon", "2023", "USA", "Series D", "$481M (Series D)",
     "Andreessen Horowitz, Accel, Bain Capital Ventures, Coatue, Index Ventures",
     "AI customer support agents, LLM-driven", "Horizontal support platform",
     "Tech & enterprise SaaS", "Strong UX; not built for regulated workflows"],
    ["2", "Kore.ai", "2012", "USA", "PE-backed", "$223M (Series D, PE Exit)",
     "Vistara Growth, Sterling National Bank, PNC, NVIDIA; FTV Capital",
     "Enterprise conversational AI platform", "Horizontal support platform",
     "Large enterprises, some FS", "Often shortlisted via Gartner MQ"],
    ["2", "PolyAI", "2017", "UK", "Series D", "$202M (Series D)",
     "Amadeus Capital Partners, Passion Capital, Point72 Ventures, Khosla Ventures, Georgian, Hedosophia",
     "Voice-focused conversational AI assistants for enterprise customer service and contact center automation",
     "Horizontal Support Platform", "Large enterprises, contact centers, airlines, banking",
     "Voice-first automation, not FS-native, lacks SOP-based workflow orchestration"],
    ["2", "Ada", "2016", "Canada", "Series C", "$192M (Series C)",
     "Bessemer Venture Partner, FirstMark, Accel, Spark Capital, FedDev",
     "Enterprise chatbot & automation platform", "Horizontal support platform",
     "Large enterprises", "Broad adoption; limited FS-specific depth"],
    ["2", "Amelia", "1998", "USA", "Acquired by SoundHound", "$175M (PE and Debt Financing)",
     "P.E. undisclosed / Debt to Monroe Capital", "Conversational AI & automation",
     "Horizontal support platform", "Large enterprises", "Legacy platform, broad but heavy"],
    ["2", "Cognigy", "2016", "Germany", "Series C", "$169M (Series C)",
     "DN Capital, Inventures, Nordic Makers, Global Brain Corporation, Insight Partners, DTCP, Eurazeo",
     "Enterprise conversational AI platform enabling automation across chat and voice channels.",
     "Horizontal Support Platform", "Enterprise, regulated industries, contact centers",
     "Strong enterprise CX automation player, horizontal tooling rather than vertical FS flow."],
    ["2", "Wonderful", "2021", "USA", "Series A", "$133M (Series A)", "Index Ventures",
     "AI support agents", "Horizontal support platform", "SMB / mid-market",
     "Early; not FS-focused"],
    ["2", "Replicant", "2017", "USA", "Series B", "$113M (Series B)",
     "Atomic, Norwest, Stripes",
     "AI voice agents designed to automate customer service calls and replace traditional call center workflows",
     "Horizontal Support Platform", "Enterprise, product centers",
     "Voice automation specialist, focuses on call handling rather than regulated workflows"],
    ["2", "Voiceflow", "2019", "USA", "Series B", "$39M (Series B)",
     "Ripple Ventures, True Ventures, Felixis, OpenView",
     "Platform for building conversational AI agents and designing automation workflows",
     "Horizontal Support Platform", "Developer, product teams, enterprises",
     "Tooling layer rather than end-to-end execution platform, less comparable to Gradient's deployment model"],
    ["2", "Ultimate (Zendesk)", "2016", "France", "Acquired by Zendesk", "$27M (Series D)",
     "Techstars, HV Capital, Maki.vc, Omers Ventures; EXITED: Zendesk",
     "AI automation for customer support", "Horizontal Support Platform", "Enterprise",
     "Integrated into Zendesk ecosystem"],
    ["2", "Zalon", "2017", "France", "Series B", "$14M (Series B)",
     "La France Mutualiste, Fortino Capital, Truffle Capital, 115k",
     "AI voice automation platform for customer interaction and call handling.",
     "Horizontal Support Platform", "Enterprise contact centers",
     "European callbot vendor focused on voice automation."],
    ["2", "CallDesk", "2016", "France", "Acquired by Future", "$2.5M", "Point Nine",
     "Voice AI for call centers", "Horizontal support (voice)", "Enterprise contact centers",
     "Narrow (voice-only)"],

    # ── Tier 3 — adjacent / FS point solutions & CX suites ──
    ["3", "Verint", "1994", "USA", "Public", "", "NowForce, Centrical",
     "CX & workforce analytics, AI add-ons", "Enterprise CX suite", "Large enterprises",
     "Legacy incumbent; AI layered on"],
    ["3", "Greenlite AI", "2023", "San Francisco, USA", "Series A", "$20M (Series A)",
     "Greylock, Thomson Reuters Ventures, Canvas Ventures",
     "AI 'compliance workforce' to automate regulated compliance ops",
     "FS point solution", "Banks, fintechs, broker-dealers",
     "Directly targets regulated compliance workflows (alert handling, reviews, remediation)"],
    ["3", "Parcha AI", "2023", "San Francisco, USA", "Seed / Pre-seed", "$5M (Seed)",
     "Kindred Ventures, Initialized Capital",
     "Automates KYC/KYB reviews + compliance operations with AI agents",
     "FS point solution", "Fintechs, banks",
     "Strong 'ops automation' wedge (review queues); founding year varies by database (some list 2020)"],
    ["3", "Strise", "2016", "Oslo, Norway", "Series A", "$10.8M (Series A)",
     "Atomico, Curiosity, Maki.vc, Sondo",
     "'KYC intelligence' + AML automation (graph + AI) for due diligence",
     "FS point solution", "Banks, fintechs",
     "Compliance productivity tool; narrower than full fincrime platforms"],
    ["3", "Bits Technology", "2022", "Stockholm, Sweden", "Series A", "€12M (Series A)",
     "Alstin Capital, Cherry Ventures, Unusual Ventures, Alliance Ventures",
     "Compliance + onboarding infrastructure (KYC/KYB/AML + risk)",
     "FS point solution", "Fintechs, banks",
     "Infrastructure-y point solution; 'unify workflows' positioning"],
    ["3", "Flagright", "2021", "Berlin, Germany", "Seed", "$4.3M (Seed)", "Frontline Ventures",
     "AI-native AML/transaction monitoring + case management", "FS point solution",
     "Fintechs, payments, banks", "Modern TM/case mgmt wedge; strong fit for regulated ops teams"],
    ["3", "Unit21", "2018", "San Francisco, USA", "Series C", "$45M (Series C)",
     "Tiger Global, South Park Commons",
     "Risk & compliance infrastructure (fraud/AML ops, investigations)",
     "FS point solution", "Fintechs, banks",
     "Not 'agentic,' but often competes for compliance workflow budget"],
    ["3", "Diligent (YC)", "2023", "Berlin, Germany", "Seed", "Undisclosed (YC)", "Y Combinator",
     "AI agents to automate customer due diligence (CDD) tasks", "FS point solution",
     "Fintechs, banks", "Early-stage but directly overlaps with 'agentic compliance ops' wedge"],
]

out = Path(__file__).resolve().parent / "demo_competitor.csv"
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerows(ROWS)
print(f"Wrote {out} ({len(ROWS)} rows + header)")
