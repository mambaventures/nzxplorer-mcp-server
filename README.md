# NZXplorer MCP Server

[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-blue?style=flat&logo=cursor)](cursor://anysphere.cursor-deeplink/mcp/install?name=nzxplorer&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm56eHBsb3Jlci1tY3AiXSwiZW52Ijp7Ik5aWFBMT1JFUl9BUElfS0VZIjoiWU9VUl9BUElfS0VZIn19)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-007ACC?style=flat&logo=visualstudiocode)](vscode:mcp/install?%7B%22name%22%3A%22nzxplorer%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22nzxplorer-mcp%22%5D%2C%22env%22%3A%7B%22NZXPLORER_API_KEY%22%3A%22YOUR_API_KEY%22%7D%7D)
[![Smithery](https://smithery.ai/badge/@mambaventures/nzxplorer-mcp)](https://smithery.ai/server/@mambaventures/nzxplorer-mcp)
[![npm version](https://img.shields.io/npm/v/nzxplorer-mcp.svg)](https://www.npmjs.com/package/nzxplorer-mcp)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants like Claude Desktop, Cursor, VS Code, and Claude Code direct access to New Zealand stock market data via the [NZXplorer API](https://nzxplorer.co.nz/developers).

Query 130 NZX-listed companies, 1,300+ directors, 162,000+ daily stock prices, governance risk scores, 4,100+ insider trades, 64,000+ company announcements, board composition analytics, anomaly detection, market signals, proxy advisory voting recommendations, and a powerful stock screener with 87+ metrics — all from natural language.

## One-click install

| Client | Install |
|--------|---------|
| **Cursor** | [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=nzxplorer&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm56eHBsb3Jlci1tY3AiXSwiZW52Ijp7Ik5aWFBMT1JFUl9BUElfS0VZIjoiWU9VUl9BUElfS0VZIn19) (deeplink) |
| **VS Code** | [Add to VS Code](vscode:mcp/install?%7B%22name%22%3A%22nzxplorer%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22nzxplorer-mcp%22%5D%2C%22env%22%3A%7B%22NZXPLORER_API_KEY%22%3A%22YOUR_API_KEY%22%7D%7D) (deeplink) |
| **Claude Code** | `claude mcp add nzxplorer -- npx -y nzxplorer-mcp` |
| **Claude Desktop / Windsurf / Goose** | `npx -y @smithery/cli@latest install @mambaventures/nzxplorer-mcp --client claude` (replace `claude` with `windsurf` / `goose`) |
| **Any client (Smithery)** | [Install via Smithery](https://smithery.ai/server/@mambaventures/nzxplorer-mcp) |

After install, set `NZXPLORER_API_KEY` from your [NZXplorer Settings → API & Developer](https://nzxplorer.co.nz/settings?section=api) page.

## Quick Install (npm)

```bash
npx nzxplorer-mcp
```

Or install globally:

```bash
npm install -g nzxplorer-mcp
```

## Available Tools (58)

| Tool | Description |
|------|-------------|
| `get_companies` | List NZX companies with search and sector filters |
| `get_company` | Company detail by ticker — optionally include directors, financials, governance score, latest price |
| `get_directors` | Search directors by name or filter by company |
| `get_director` | Director profile with biography, appointments, insider trades, board fees, and executive compensation |
| `get_stock_prices` | Daily OHLCV price data with date range and lookback filters |
| `get_governance_scores` | Governance Risk Scores (0-100) for all 130 NZX companies across 6 components |
| `search_announcements` | Full-text search across 64,000+ NZX announcements (2017-2026) |
| `get_insider_trades` | Director share transactions — buys, sells, exercises. Filter by ticker, director, date, type |
| `get_financials` | Normalized financial statements — income, balance sheet, cash flow, ratios. FY2010-2025 |
| `get_earnings` | Structured earnings results — revenue, profit, EPS, guidance. Extracted from NZX PDFs |
| `get_dividends` | Dividend history — DPS, imputation, DRP, payment dates. Plus dividend safety metrics |
| `get_technical_signals` | Technical indicators — SMA-50/100/200, RSI-14, golden/death cross, volume ratios |
| `screen_stocks` | Screen stocks using 87+ metrics, 12 smart presets, and custom filters (e.g. PE<15, RSI<30) |
| `get_performance` | Stock performance — returns (1D-5Y), alpha vs NZX50, volatility, beta, 52-week range |
| `get_director_due_diligence` | Comprehensive director due diligence report — 8 tables, 11 sections |
| `get_market_signals` | Market Intelligence Feed — 10 signal types, unified event stream across all NZX companies |
| `get_anomalies` | Anomaly detection — 12 types across 5 categories (insider, governance, financial, market, AGM) |
| `get_proxy_report` | Proxy advisory voting recommendations — FOR/AGAINST/REFER per AGM resolution with 34 rules, 8 policy presets |
| `get_takeovers` | M&A and takeover activity — 313 deals, 51 issuers, 11 deal types (2017-2026) |
| `get_board_changes` | Board changes — appointments, resignations, retirements. 1,242 changes across 105 issuers |
| `get_board_composition_report` | Board composition analytics — independence, diversity, tenure, skills, succession risk, peer comparison |
| `get_accounting_quality` | Accounting quality scores — Beneish M-score, Piotroski F-score, Altman Z-score, interest coverage, current ratio, overall rating |
| `get_credit_ratings` | Credit ratings from S&P, Moody's, Fitch, AM Best — rating, outlook, action, history |
| `get_risk_language` | Risk language scoring — 8 categories (going concern, covenant, litigation, etc.) across 64K+ announcements |
| `search_keyword_trends` | Keyword frequency trends across NZX announcements — like Google Trends for corporate filings |
| `list_stewardship_reports` | List FMA-compliant stewardship/voting-record reports (Enterprise) |
| `get_stewardship_report` | Full stewardship report detail with per-company resolution analysis (Enterprise) |
| `list_voting_policies` | List custom voting policies for the proxy advisory engine (Enterprise/Institutional) |
| `get_revenue_segments` | Revenue segment breakdown — IFRS 8 operating, geographic, product segments |
| `list_alert_subscriptions` | List alert subscriptions — 11 signal types, 6 anomaly categories, HMAC-SHA256 webhooks (Enterprise) |
| `get_capital_raises` | Capital raise history — 11,088 events across 130 issuers (placements, rights, SPPs, buybacks, DRPs) |
| `get_semantic_search` | AI semantic search across 64K+ announcements — hybrid keyword+vector+reranking |
| `get_iod_designations` | IoD designated directors — CFInstD, CMInstD, CDir, MInstD credentials on NZX boards |
| `get_board_skills_matrix` | Board skills matrix — 12 IoD NZ/ASX categories, gap analysis, diversity score |
| `get_research_briefing` | Investment research briefing — 15+ data sources, AI narrative, 4 templates (general/thesis/DD/board) |
| `get_fund_votes` | Fund manager voting records — Harbour, Devon, Mint, Fisher, NZ Super Fund. FOR/AGAINST/ABSTAIN per resolution |
| `get_deal_advisers` | Deal advisers — law firms, investment banks, valuers who advised on capital raises and takeovers |
| `get_company_directorships` | Full directorship history from NZ Companies Register — NZX + private companies, status, failure rate |
| `get_director_workload` | Workload analysis — NZX board seats, Companies Office roles, overboarding risk, attendance, tenure |
| `get_director_network` | Cross-directorship and board interlock analysis — company, director, or NZX-wide mode |
| `get_board_pipeline` | Directors who recently freed up capacity — resignations, retirements, available talent for recruitment |
| `get_financials_xbrl` | Machine-readable iXBRL income/balance/cash-flow with IFRS taxonomy tags. 116 companies, FY2010-2025 |
| `get_esg_xbrl` | Machine-readable NZ CS 1-3 tagged ESG/climate disclosure — Scope 1/2/3 emissions, diversity, safety, GRI/TCFD/SBTi/SDG |
| `get_announcement_sentiment` | AI-scored sentiment (-1 to +1) for NZX announcements with confidence, hedging, buried risks, guidance direction |
| `get_ir_quality` | IR disclosure quality score (0-100) — 5 dimensions: Timeliness, Completeness, Readability, Frequency, Governance Transparency |
| `get_peer_mentions` | Cross-company references extracted from 62,000+ NZX announcements — who mentions whom, with context snippets |
| `get_political_connections` | MP interests, political donors, and party donations linked to an NZX company or its directors |
| `get_management_team` | Current C-suite (CEO/CFO/COO/CTO/etc.) with roles, tenure, biographies. 127 issuers, 508 executives |
| `get_beneficial_ownership` | See through custodian nominees to fund managers behind NZX shareholdings. 56 fund managers, KiwiSaver/ETF/sovereign |
| `get_substantial_holder_notices` | Classified SPH notices with extracted holders, %, direction (increase/decrease/initial/ceased). 9,700+ notices |
| `get_corporate_giving` | Corporate donations, sponsorships, community investment — recipients, amounts, types, charity cross-links |
| `get_property_portfolio` | REIT/property-company portfolios — addresses, book values, cap rate, WALE, occupancy, tenants, dev pipeline |
| `get_fair_value` | Estimated fair value per share via DCF + Dividend Discount + EV/EBITDA models. Estimate, not a target price |
| `get_governance_scorecard` | Per-company governance scorecard — 15 NZSA/NZX-aligned policy areas with RAG ratings and overall 0-100 score |
| `check_insolvency_status` | MBIE Insolvency Register lookup — bankruptcy, no-asset procedures, summary instalment orders by person slug |
| `get_officer_history` | Full historical officer timeline for a company — every director + executive who ever held a role, with start/end dates, tenure, committees, status |
| `get_compensation_benchmark` | P10/P25/P50/P75/P90 compensation percentiles for a role (CEO/CFO/COO/Chair/Director/etc.) across NZX, with sector + market-cap-tier breakdowns |
| `get_daily_market_wrap` | Daily NZX market wrap — price moves, breadth (gainers/decliners), announcements, insider trades, upcoming dividends, board changes + AI narrative summary |

## Setup

### 1. Get an API Key

Get your free API key at [nzxplorer.co.nz/developers](https://nzxplorer.co.nz/developers).

### 2. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

**Using npx (recommended):**

```json
{
  "mcpServers": {
    "nzxplorer": {
      "command": "npx",
      "args": ["-y", "nzxplorer-mcp"],
      "env": {
        "NZXPLORER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Using local install:**

```json
{
  "mcpServers": {
    "nzxplorer": {
      "command": "node",
      "args": ["/absolute/path/to/nzxplorer-mcp-server/build/index.js"],
      "env": {
        "NZXPLORER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 2b. Or Configure Cursor

Add to Cursor's MCP settings (`.cursor/mcp.json` in your project or global config):

```json
{
  "mcpServers": {
    "nzxplorer": {
      "command": "npx",
      "args": ["-y", "nzxplorer-mcp"],
      "env": {
        "NZXPLORER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Example Prompts

Once connected, you can ask Claude things like:

- "What are the top governance-rated companies on the NZX?"
- "Show me Air New Zealand's board of directors and their backgrounds"
- "Get Fisher & Paykel Healthcare's stock price for the last 30 days"
- "Search for dividend announcements from Spark in 2025"
- "Which NZX companies have a governance score below 50?"
- "Show me the biggest insider trades on the NZX this month"
- "Who is buying shares in Ryman Healthcare?"
- "What is the CEO of FPH paid? Show their executive compensation"
- "Screen for undervalued stocks: PE under 15 with dividend yield above 4%"
- "Find oversold NZX stocks with RSI below 30"
- "Which stocks have a golden cross signal right now?"
- "Show me Air New Zealand's financial performance over the last 5 years"
- "Are there any red flags or anomalies on the NZX right now?"
- "What market events happened this week?"
- "Any insider trading clusters or governance concerns for Fletcher Building?"
- "How should I vote at the Air New Zealand AGM?"
- "Get the proxy advisory report for Mercury NZ"
- "What are the voting recommendations for Spark's resolutions?"
- "Analyze the board composition of Fisher & Paykel Healthcare"
- "What is the succession risk for Air New Zealand's board?"
- "Who recently joined or left the board at Fletcher Building?"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NZXPLORER_API_KEY` | Yes | Your API key from nzxplorer.co.nz/developers |
| `NZXPLORER_API_URL` | No | Override API base URL (default: `https://nzxplorer.co.nz`) |

## Data Coverage

| Data | Records | Coverage |
|------|---------|----------|
| Companies | 130 | All NZX-listed issuers |
| Directors | 1,300+ | Current and historical board members |
| Stock Prices | 162,000+ | Daily OHLCV, updated daily |
| Governance Scores | 130 | GRS v2.0 — 6 components, 0-100 scale |
| Announcements | 64,000+ | Full NZX archive 2017-2026 |
| Insider Trades | 4,100+ | Director share transactions |
| Executive Compensation | 491 | CEO/CFO pay packages with STI/LTI |
| Shareholders | 2,400+ | Top 20 + substantial holders |
| Dividends | 1,184 | Per-dividend records with imputation data |
| Earnings | 389 | Structured results from NZX PDFs |
| Financial Metrics | 367 | 41 ratios across 116 companies |
| Technical Signals | 127 | SMA, RSI, golden/death cross, updated daily |
| Screener | 87+ columns | 12 presets, custom filters, all companies |

## Rate Limits

| Tier | Requests/min |
|------|-------------|
| Free | 10 |
| Pro | 100 |
| Enterprise | 500 |

## License

MIT
