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
  version: "1.16.0",
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
// Tool 12: get_technical_signals
// ---------------------------------------------------------------------------

server.tool(
  "get_technical_signals",
  "Get technical analysis indicators for an NZX company. Returns SMA-50/100/200 moving averages, RSI-14 momentum, golden/death cross signals, distance from 52-week high/low, and volume ratios. Updated daily. 127/130 companies covered.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
  },
  async ({ ticker }) => {
    const text = await api(`/technical-signals/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 13: screen_stocks
// ---------------------------------------------------------------------------

server.tool(
  "screen_stocks",
  "Screen NZX stocks using 87+ financial, governance, and technical metrics. Supports 12 smart presets (value, growth, quality, dividend_at_risk, insider_buying, capital_raise_likely, ceo_pay_for_failure, governance_laggards, oversold, overbought, golden_cross, below_200ma) and custom metric filters. Returns matching companies with selected columns, sorted by any metric. Use this to find stocks matching specific criteria like 'PE under 15 with dividend yield above 5%' or 'RSI below 30'.",
  {
    preset: z
      .enum([
        "value",
        "growth",
        "quality",
        "dividend_at_risk",
        "insider_buying",
        "capital_raise_likely",
        "ceo_pay_for_failure",
        "governance_laggards",
        "oversold",
        "overbought",
        "golden_cross",
        "below_200ma",
      ])
      .optional()
      .describe(
        "Smart preset filter. Each preset applies specific metric filters and shows relevant columns.",
      ),
    filter: z
      .string()
      .optional()
      .describe(
        "Custom metric filters as comma-separated conditions. Format: metric>value,metric<value. Examples: 'pe_ratio<15,dividend_yield>3', 'rsi_14<30', 'roe>15,debt_to_equity<1'. Operators: >, <, >=, <=, =. Available metrics include: pe_ratio, pb_ratio, dividend_yield, roe, roa, net_margin, revenue_growth_yoy, debt_to_equity, current_ratio, rsi_14, price_vs_sma200_pct, grs_score, insider_conviction_score, dividend_safety_score, and 70+ more.",
      ),
    sector: z
      .string()
      .optional()
      .describe("Filter by sector (e.g. 'Energy', 'Healthcare', 'Property')"),
    q: z.string().optional().describe("Search by company name or ticker"),
    sort: z
      .string()
      .optional()
      .describe(
        "Sort by any column name (e.g. 'pe_ratio', 'market_cap', 'dividend_yield', 'rsi_14', 'grs_score')",
      ),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order (default 'asc')"),
    limit: z
      .number()
      .min(1)
      .max(130)
      .optional()
      .describe("Number of results (default 50, max 130)"),
  },
  async ({ preset, filter, sector, q, sort, order, limit }) => {
    const text = await api("/screener", { preset, filter, sector, q, sort, order, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 14: get_performance
// ---------------------------------------------------------------------------

server.tool(
  "get_performance",
  "Get stock performance metrics for an NZX company. Returns price returns (1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y), alpha vs NZX50 benchmark, sector alpha, volatility, beta, 52-week high/low, and market capitalization. Updated daily.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
  },
  async ({ ticker }) => {
    const text = await api(`/performance/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 15: get_director_due_diligence
// ---------------------------------------------------------------------------

server.tool(
  "get_director_due_diligence",
  "Get a comprehensive due diligence report for any NZX director. Aggregates all board positions (with GRS scores), overboarding assessment, remuneration across all boards with peer percentile, executive compensation, insider trading activity summary, AGM election voting record, governance contribution analysis, stock performance during tenure, and automated risk flags. Designed for executive search firms, law firms, and nominating committees assessing board candidates.",
  {
    slug: z
      .string()
      .describe(
        "Director URL slug (e.g. 'joan-withers', 'mark-cross'). Find slugs via get_directors.",
      ),
  },
  async ({ slug }) => {
    const text = await api(`/director-report/${slug}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 16: get_market_signals
// ---------------------------------------------------------------------------

server.tool(
  "get_market_signals",
  "Get the Market Intelligence Feed — a unified stream of all NZX market events: 10 signal types including insider trades, capital raises, dividends, earnings releases, AGM results, director changes, governance score changes, technical signals (golden/death cross, RSI extremes), credit rating changes, and auditor changes. Sorted by date descending. Use for 'what happened on the NZX today/this week?', 'any golden crosses?', 'credit rating changes?', or 'market activity for [company]'.",
  {
    ticker: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR', 'MEL')"),
    type: z
      .string()
      .optional()
      .describe(
        "Comma-separated signal types: insider_trade, capital_raise, dividend, earnings, agm_result, director_change, grs_change, technical_signal, credit_rating, audit_change",
      ),
    days: z
      .number()
      .optional()
      .describe(
        "Days to look back (default 180). Use 7 for 'this week', 1 for 'today'.",
      ),
    significance: z
      .string()
      .optional()
      .describe("Filter by significance: high, medium, low"),
    sector: z
      .string()
      .optional()
      .describe("Filter by sector (e.g. 'Energy', 'Healthcare')"),
    limit: z
      .number()
      .optional()
      .describe("Max results (default 50)"),
  },
  async ({ ticker, type, days, significance, sector, limit }) => {
    const text = await api("/signals", {
      ticker,
      type,
      days,
      significance,
      sector,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// Tool 17: get_anomalies
// ---------------------------------------------------------------------------

server.tool(
  "get_anomalies",
  "Detect unusual patterns and red flags across NZX companies. Scans 12 anomaly types across 5 categories: insider trading (clusters, exodus, conviction shifts), governance (GRS deterioration, director exodus, audit changes), financial (dividend cut risk, capital raise patterns, earnings concerns), market (technical breakdowns/breakouts), and AGM (shareholder revolts). Returns anomalies sorted by severity. Use for 'any red flags?', 'governance concerns for [company]?', 'insider trading anomalies'.",
  {
    ticker: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR', 'MEL')"),
    category: z
      .string()
      .optional()
      .describe(
        "Filter by category: insider, governance, financial, market, agm",
      ),
    severity: z
      .string()
      .optional()
      .describe("Filter by severity: critical, warning, watch"),
    sector: z
      .string()
      .optional()
      .describe("Filter by sector (e.g. 'Energy', 'Healthcare')"),
    days: z
      .number()
      .optional()
      .describe("Days to look back (default 180)"),
  },
  async ({ ticker, category, severity, sector, days }) => {
    const text = await api("/anomalies", {
      ticker,
      category,
      severity,
      sector,
      days,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// Tool 19: get_financials_xbrl
// ---------------------------------------------------------------------------

server.tool(
  "get_financials_xbrl",
  "Get machine-readable iXBRL (Inline XBRL) financial statements for an NZX company. Returns IFRS taxonomy-tagged income statements, balance sheets, cash flows, and financial ratios. Each data point is tagged with its XBRL concept (e.g. ifrs-full:Revenue), period context, and unit. 116 companies, FY2010-2025. Use when the user wants structured/machine-readable financial data, XBRL output, or data for programmatic consumption.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
    year: z
      .string()
      .optional()
      .describe("Fiscal year (e.g. '2024'). Default: latest available year."),
  },
  async ({ ticker, year }) => {
    const url = new URL(`/api/v1/financials/${ticker.toUpperCase()}/xbrl`, BASE_URL);
    url.searchParams.set("format", "json");
    if (year) url.searchParams.set("year", year);

    const headers: Record<string, string> = {};
    if (API_KEY) headers["X-API-Key"] = API_KEY;

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as Record<string, unknown>).error || `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    const data = await res.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 20: get_esg_xbrl
// ---------------------------------------------------------------------------

server.tool(
  "get_esg_xbrl",
  "Get machine-readable NZ Climate Standards (NZ CS 1-3) tagged ESG/climate disclosure for an NZX company. Returns XRB Aotearoa taxonomy-tagged emissions (Scope 1/2/3 GHG), diversity metrics (board/SLT/employee gender), workplace safety (LTIFR/TRIFR), and reporting framework compliance (GRI, TCFD, SBTi, SDG). Use when the user wants ESG data, climate disclosures, emissions, diversity stats, or sustainability data in structured format.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'MEL', 'CEN', 'GNE')"),
    year: z
      .string()
      .optional()
      .describe("Fiscal year (e.g. '2024'). Default: latest available year."),
  },
  async ({ ticker, year }) => {
    const url = new URL(`/api/v1/esg/${ticker.toUpperCase()}/xbrl`, BASE_URL);
    url.searchParams.set("format", "json");
    if (year) url.searchParams.set("year", year);

    const headers: Record<string, string> = {};
    if (API_KEY) headers["X-API-Key"] = API_KEY;

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as Record<string, unknown>).error || `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    const data = await res.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 21: get_proxy_report
// ---------------------------------------------------------------------------

server.tool(
  "get_proxy_report",
  "Get automated proxy advisory voting recommendations for a company's AGM resolutions. Analyses board composition, remuneration, auditor independence, capital management, constitution changes, related-party transactions, and shareholder proposals against configurable voting policies (8 presets including NZ Super Fund, ISS NZ Benchmark, Russell Investments NZ, Vanguard AU/NZ). Returns FOR/AGAINST/REFER per resolution with severity, reasoning, and data points. Use for 'how should I vote at [company] AGM?', 'proxy report for AIR', 'voting recommendations for MEL'.",
  {
    ticker: z
      .string()
      .describe("Company ticker (e.g. 'AIR', 'MEL', 'FPH')"),
    year: z
      .string()
      .optional()
      .describe("Meeting year to filter resolutions (e.g. '2025'). Default: latest"),
    meeting_id: z
      .string()
      .optional()
      .describe("Specific meeting ID if known"),
  },
  async ({ ticker, year, meeting_id }) => {
    const text = await api(`/proxy-report/${encodeURIComponent(ticker)}`, {
      year,
      meeting_id,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 22: get_takeovers
// ---------------------------------------------------------------------------

server.tool(
  "get_takeovers",
  "Get M&A and takeover activity for NZX companies. 313 deals across 51 issuers (2017-2026). 11 deal types: takeover_offer, acquisition, scheme_of_arrangement, merger, asset_acquisition, property_acquisition, compulsory_acquisition, and more. Returns acquirer, target, deal type, offer price, premium, status, acceptance %, key dates, and conditions. Use for 'any takeover activity for [company]?', 'recent M&A deals', 'scheme of arrangement history'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol of the target company (e.g. 'THL', 'NZM', 'TRA')"),
    status: z
      .string()
      .optional()
      .describe("Filter by deal status (e.g. 'completed', 'active', 'lapsed', 'withdrawn')"),
    deal_type: z
      .string()
      .optional()
      .describe(
        "Filter by deal type: takeover_offer, acquisition, scheme_of_arrangement, merger, asset_acquisition, property_acquisition, compulsory_acquisition",
      ),
    year: z
      .string()
      .optional()
      .describe("Filter by year (e.g. '2025') or range (e.g. '2020-2025')"),
  },
  async ({ ticker, status, deal_type, year }) => {
    const text = await api(`/takeovers/${ticker.toUpperCase()}`, {
      status,
      deal_type,
      year,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 23: get_board_changes
// ---------------------------------------------------------------------------

server.tool(
  "get_board_changes",
  "Get board changes (director appointments, resignations, retirements, removals) for an NZX company. 1,242 changes across 105 issuers (2017-2026). Shows director name, action, role, effective date, who they replaced, reason for departure, and linked director profile. Use for 'who joined/left the board?', 'recent director changes at [company]', 'board turnover history'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
    action: z
      .string()
      .optional()
      .describe(
        "Filter by action type: appointed, resigned, retired, removed, elected, re-elected. Comma-separated for multiple (e.g. 'resigned,retired').",
      ),
    from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    to: z.string().optional().describe("End date in YYYY-MM-DD format"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50, max 100)"),
  },
  async ({ ticker, action, from, to, limit }) => {
    const text = await api(`/board-changes/${ticker.toUpperCase()}`, {
      action,
      from,
      to,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 24: get_board_composition_report
// ---------------------------------------------------------------------------

server.tool(
  "get_board_composition_report",
  "Get a comprehensive board composition analytics report for an NZX company. Analyzes board independence vs NZX Code requirements, gender diversity vs 30% target, tenure distribution with 9-year limit flags, skills matrix with gap identification, meeting attendance, director fee benchmarking, CEO pay ratio, succession risk scoring (low/medium/high/critical), board turnover rates, and peer comparison against sector averages. Returns automated risk flags across 10 categories. Use for 'board composition for [company]', 'governance quality analysis', 'succession risk', 'board diversity metrics', or 'nomination committee report'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
  },
  async ({ ticker }) => {
    const text = await api(`/board-report/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 25: get_accounting_quality
// ---------------------------------------------------------------------------

server.tool(
  "get_accounting_quality",
  "Get accounting quality scores for an NZX company. Shows Beneish M-score (earnings manipulation probability, >-1.78 suggests manipulation), Piotroski F-score (financial strength 0-9, higher is better), Altman Z-score (bankruptcy risk: >2.99 safe, 1.81-2.99 grey zone, <1.81 distress), plus interest coverage, current ratio, and overall composite score (0-100). 128 issuers scored. Use for 'is [company] at risk of manipulation?', 'financial health of [company]', 'bankruptcy risk', 'accounting quality'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year: single year (e.g. '2024') or range (e.g. '2020-2024')"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ ticker, year, limit }) => {
    const text = await api(`/accounting-quality/${ticker.toUpperCase()}`, { year, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 26: get_credit_ratings
// ---------------------------------------------------------------------------

server.tool(
  "get_credit_ratings",
  "Get credit rating history for an NZX company. Shows S&P, Moody's, Fitch, AM Best, Equifax ratings with upgrades, downgrades, outlook changes, and rating actions. ~80 ratings across ~20 NZX issuers (mainly banks, utilities, large caps). Use for 'credit rating for [company]', 'has [company] been downgraded?', 'investment grade NZX companies'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'ANZ', 'WBC', 'MEL', 'SPK')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year: single year (e.g. '2024') or range (e.g. '2020-2024')"),
    agency: z
      .string()
      .optional()
      .describe("Filter by rating agency: 'S&P', 'Moodys', 'Fitch', 'AM Best', 'Equifax'"),
    action: z
      .string()
      .optional()
      .describe("Filter by action: affirmed, upgraded, downgraded, assigned, withdrawn, revised"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ ticker, year, agency, action, limit }) => {
    const text = await api(`/credit-ratings/${ticker.toUpperCase()}`, { year, agency, action, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 27: get_risk_language
// ---------------------------------------------------------------------------

server.tool(
  "get_risk_language",
  "Get pre-computed risk language scores for an NZX company. Scans 64,000+ announcements for 8 risk categories: going_concern, covenant, impairment, litigation, restructuring, liquidity, regulatory, force_majeure. Returns total mentions, 12-month trend, category breakdown, critical flags, first-time detections, and yearly trend. Use when asked about risk factors, going concern warnings, covenant issues, litigation exposure, or regulatory risk.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'FBU', 'AIR', 'MEL')"),
  },
  async ({ ticker }) => {
    const text = await api(`/risk-language/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 28: search_keyword_trends
// ---------------------------------------------------------------------------

server.tool(
  "search_keyword_trends",
  "Search any keyword or phrase across 64,000+ NZX company announcements and see how often it appears over time. Returns frequency by year, sector, and top companies. Like Google Trends for corporate filings. Use for 'when did companies start talking about AI?', 'which sector mentions climate risk most?', 'how often does restructuring appear in filings?'.",
  {
    keyword: z.string().describe("Keyword or phrase to search (e.g. 'artificial intelligence', 'restructuring', 'net zero', 'covenant breach')"),
  },
  async ({ keyword }) => {
    const text = await api("/keyword-trends", { keyword });
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
