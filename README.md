# NZXplorer MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants like Claude Desktop and Cursor direct access to New Zealand stock market data via the [NZXplorer API](https://nzxplorer.co.nz/developers).

Query 130 NZX-listed companies, 1,300+ directors, 162,000+ daily stock prices, governance risk scores, 4,100+ insider trades, 64,000+ company announcements, anomaly detection, market signals, and a powerful stock screener with 87+ metrics — all from natural language.

## Quick Install (npm)

```bash
npx nzxplorer-mcp
```

Or install globally:

```bash
npm install -g nzxplorer-mcp
```

## Available Tools

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
