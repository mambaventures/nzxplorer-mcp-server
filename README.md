# NZXplorer MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants like Claude Desktop and Cursor direct access to New Zealand stock market data via the [NZXplorer API](https://nzxplorer.co.nz/developers).

Query 130 NZX-listed companies, 1,300+ directors, 162,000+ daily stock prices, governance risk scores, and 64,000+ company announcements — all from natural language.

## Available Tools

| Tool | Description |
|------|-------------|
| `get_companies` | List NZX companies with search and sector filters |
| `get_company` | Company detail by ticker — optionally include directors, financials, governance score, latest price |
| `get_directors` | Search directors by name or filter by company |
| `get_director` | Director profile with biography, appointments, insider trades, remuneration history |
| `get_stock_prices` | Daily OHLCV price data with date range and lookback filters |
| `get_governance_scores` | Governance Risk Scores (0-100) for all 130 NZX companies across 6 components |
| `search_announcements` | Full-text search across 64,000+ NZX announcements (2017-2026) |

## Setup

### 1. Get an API Key

Get your free API key at [nzxplorer.co.nz/developers](https://nzxplorer.co.nz/developers).

### 2. Install

```bash
git clone https://github.com/mambaventures/nzxplorer-mcp-server.git
cd nzxplorer-mcp-server
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### 3b. Or Configure Cursor

Add to Cursor's MCP settings (`.cursor/mcp.json` in your project or global config):

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

## Example Prompts

Once connected, you can ask Claude things like:

- "What are the top governance-rated companies on the NZX?"
- "Show me Air New Zealand's board of directors and their backgrounds"
- "Get Fisher & Paykel Healthcare's stock price for the last 30 days"
- "Search for dividend announcements from Spark in 2025"
- "Which NZX companies have a governance score below 50?"
- "Compare the board structures of Ryman Healthcare and Summerset"

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
| Shareholders | 2,400+ | Top 20 + substantial holders |

## Rate Limits

| Tier | Requests/min |
|------|-------------|
| Free | 10 |
| Pro | 100 |
| Enterprise | 500 |

## License

MIT
