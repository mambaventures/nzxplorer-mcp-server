#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NZXPLORER_API_URL || "https://nzxplorer.co.nz";
const API_KEY = process.env.NZXPLORER_API_KEY;

async function api(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<string> {
  const url = new URL(`/api/v1${path}`, BASE_URL);
  url.searchParams.set("format", "llm");

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as Record<string, unknown>).error || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  const data = await res.json();
  return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "nzxplorer",
  version: "1.4.0",
});

// ---------------------------------------------------------------------------
// Tool 1: get_companies
// ---------------------------------------------------------------------------

server.tool(
  "get_companies",
  "List NZX-listed companies. Returns ticker, name, sector, market cap for 130 companies on the New Zealand Stock Exchange.",
  {
    search: z.string().optional().describe("Search by company name or ticker symbol"),
    sector: z.string().optional().describe("Filter by sector (e.g. 'Energy', 'Healthcare', 'Property')"),
    limit: z.number().min(1).max(100).optional().describe("Number of results (default 50, max 100)"),
  },
  async ({ search, sector, limit }) => {
    const text = await api("/companies", { search, sector, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 2: get_company
// ---------------------------------------------------------------------------

server.tool(
  "get_company",
  "Get detailed information about a specific NZX company by ticker symbol. Optionally include directors, financials, governance score, and latest stock price.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'SPK', 'FPH', 'RYM')"),
    include: z
      .string()
      .optional()
      .describe(
        "Comma-separated additional data to include: directors, financials, governance, price, or 'all' for everything",
      ),
  },
  async ({ ticker, include }) => {
    const text = await api(`/companies/${ticker.toUpperCase()}`, { include });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 3: get_directors
// ---------------------------------------------------------------------------

server.tool(
  "get_directors",
  "List directors of NZX-listed companies. Search by name or filter by company ticker. Returns name, roles, appointment dates.",
  {
    search: z.string().optional().describe("Search by director name"),
    company: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR' to get Air New Zealand directors)"),
    current: z
      .boolean()
      .optional()
      .describe("If true, only return currently-serving directors"),
    limit: z.number().min(1).max(100).optional().describe("Number of results (default 50)"),
  },
  async ({ search, company, current, limit }) => {
    const text = await api("/directors", {
      search,
      company,
      current: current !== undefined ? current : undefined,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 4: get_director
// ---------------------------------------------------------------------------

server.tool(
  "get_director",
  "Get a detailed profile of a specific NZX director by their URL slug. Includes biography, board appointments, and optionally insider trades and remuneration history.",
  {
    slug: z
      .string()
      .describe("Director URL slug (e.g. 'john-smith'). Find slugs via get_directors."),
    include: z
      .string()
      .optional()
      .describe(
        "Comma-separated additional data: trades (insider share transactions), remuneration (board fees), exec_comp (executive pay packages with STI/LTI), or 'all'",
      ),
  },
  async ({ slug, include }) => {
    const text = await api(`/directors/${slug}`, { include });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 5: get_stock_prices
// ---------------------------------------------------------------------------

server.tool(
  "get_stock_prices",
  "Get historical daily stock prices for an NZX company. Returns OHLCV data (open, high, low, close, volume) in NZD.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH')"),
    days: z
      .number()
      .min(1)
      .max(2000)
      .optional()
      .describe("Number of trailing days of data (default 365)"),
    from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    to: z.string().optional().describe("End date in YYYY-MM-DD format"),
    limit: z
      .number()
      .min(1)
      .max(2000)
      .optional()
      .describe("Maximum data points to return (default 365, max 2000)"),
  },
  async ({ ticker, days, from, to, limit }) => {
    const text = await api(`/prices/${ticker.toUpperCase()}`, { days, from, to, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 6: get_governance_scores
// ---------------------------------------------------------------------------

server.tool(
  "get_governance_scores",
  "Get Governance Risk Scores (GRS v2.0) for NZX companies. Each company scored 0-100 across 6 components: Executive Remuneration, Board Structure, Shareholder Rights, Board Effectiveness, Audit & Risk, and Remuneration Disclosure. Ratings: Excellent (80+), Very Good (70-79), Good (60-69), Adequate (50-59), Poor (40-49), Very Poor (<40). Covers all 130 NZX-listed companies.",
  {
    sector: z.string().optional().describe("Filter by sector"),
    rating: z
      .enum(["Excellent", "Very Good", "Good", "Adequate", "Poor", "Very Poor"])
      .optional()
      .describe("Filter by rating tier"),
    min_score: z.number().min(0).max(100).optional().describe("Minimum total GRS score"),
    max_score: z.number().min(0).max(100).optional().describe("Maximum total GRS score"),
    limit: z.number().min(1).max(130).optional().describe("Number of results (default 50)"),
  },
  async ({ sector, rating, min_score, max_score, limit }) => {
    const text = await api("/governance", { sector, rating, min_score, max_score, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 7: search_announcements
// ---------------------------------------------------------------------------

server.tool(
  "search_announcements",
  "Search 64,000+ NZX company announcements from 2017-2026. Full-text search across announcement titles. Types include: SHINTR (insider trades), GENERAL, MKTUPDTE (market updates), SECISSUE (security issues), MEETING, DIVCASH (dividends), and 50+ more.",
  {
    search: z
      .string()
      .optional()
      .describe("Full-text search query (e.g. 'dividend', 'CEO appointment', 'capital raise')"),
    ticker: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR')"),
    type: z
      .string()
      .optional()
      .describe(
        "Filter by announcement type (e.g. 'SHINTR', 'GENERAL', 'MEETING', 'DIVCASH', 'MKTUPDTE')",
      ),
    from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    to: z.string().optional().describe("End date in YYYY-MM-DD format"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 20, max 100)"),
  },
  async ({ search, ticker, type, from, to, limit }) => {
    const text = await api("/announcements", { search, ticker, type, from, to, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 8: get_insider_trades
// ---------------------------------------------------------------------------

server.tool(
  "get_insider_trades",
  "Get insider (director) share transactions for NZX companies. 4,100+ trades covering buy/sell/exercise transactions. Shows who is buying and selling, how much, and at what price. Filter by company ticker, transaction type, date range, or specific director.",
  {
    ticker: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR', 'FPH')"),
    type: z
      .string()
      .optional()
      .describe("Filter by transaction type (e.g. 'Buy', 'Sell', 'Exercise')"),
    director: z
      .string()
      .optional()
      .describe("Filter by director slug (e.g. 'john-smith')"),
    from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    to: z.string().optional().describe("End date in YYYY-MM-DD format"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50, max 100)"),
  },
  async ({ ticker, type, director, from, to, limit }) => {
    const text = await api("/insider-trades", { ticker, type, director, from, to, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 9: get_financials
// ---------------------------------------------------------------------------

server.tool(
  "get_financials",
  "Get normalized financial statements for an NZX company. Returns income statements, balance sheets, cash flow statements, and financial ratios. All monetary values in NZD thousands. 367 records across 116 companies, FY2010-2025.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'SPK')"),
    statement: z
      .enum(["income", "balance", "cashflow", "ratios"])
      .optional()
      .describe(
        "Which financial statement to return. If omitted, returns all four. income = revenue/profit/EPS/dividends. balance = assets/liabilities/equity. cashflow = operating/investing/financing/free. ratios = margins/ROE/ROA/debt-to-equity.",
      ),
    year: z
      .string()
      .optional()
      .describe("Filter by year: single year (e.g. '2024') or range (e.g. '2020-2024')"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results per statement (default 50)"),
  },
  async ({ ticker, statement, year, limit }) => {
    const text = await api(`/financials/${ticker.toUpperCase()}`, {
      statement,
      year,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 10: get_earnings
// ---------------------------------------------------------------------------

server.tool(
  "get_earnings",
  "Get structured earnings results for an NZX company. Extracted from full-year (FLLYR) and half-year (HALFYR) announcement PDFs. Returns revenue, net profit, EBITDA, EBIT, EPS, dividends per share, guidance, and prior period comparisons. All monetary values in NZD thousands.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'SPK')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year: single year (e.g. '2024') or range (e.g. '2020-2024')"),
    period: z
      .enum(["annual", "interim"])
      .optional()
      .describe("Filter by period type: 'annual' for full-year, 'interim' for half-year"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ ticker, year, period, limit }) => {
    const text = await api(`/earnings/${ticker.toUpperCase()}`, {
      year,
      period,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 11: get_dividends
// ---------------------------------------------------------------------------

server.tool(
  "get_dividends",
  "Get dividend history for an NZX company. Returns ex-date, record date, payment date, DPS (cents), imputation %, supplementary dividends, DRP availability, and dividend safety metrics. 1,184 records across 102 companies.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'SPK')"),
    year: z
      .string()
      .optional()
      .describe(
        "Filter by year: single year (e.g. '2024') or range (e.g. '2020-2024')",
      ),
    type: z
      .string()
      .optional()
      .describe(
        "Filter by dividend type: 'final', 'interim', or 'special'. Comma-separated for multiple.",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ ticker, year, type, limit }) => {
    const text = await api(`/dividends/${ticker.toUpperCase()}`, {
      year,
      type,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NZXplorer MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
