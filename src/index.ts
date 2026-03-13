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
  version: "1.30.0",
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
// Tool 29: list_stewardship_reports
// ---------------------------------------------------------------------------

server.tool(
  "list_stewardship_reports",
  "List FMA-compliant stewardship/voting-record reports for the authenticated user. Returns report summaries with vote counts, compliance rates, and period dates. Enterprise tier required.",
  {},
  async () => {
    const text = await api("/stewardship-reports");
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 30: get_stewardship_report
// ---------------------------------------------------------------------------

server.tool(
  "get_stewardship_report",
  "Get full detail for a specific stewardship report by ID, including per-company resolution analysis, vote recommendations, and the policy used. Enterprise tier required.",
  {
    id: z.number().describe("Stewardship report ID"),
  },
  async ({ id }) => {
    const text = await api(`/stewardship-reports/${id}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 31: list_voting_policies
// ---------------------------------------------------------------------------

server.tool(
  "list_voting_policies",
  "List all custom voting policies for the authenticated user. Each policy defines threshold overrides for the proxy advisory engine (board independence, remuneration caps, tenure limits, gender diversity, etc.). Enterprise or Institutional tier required.",
  {},
  async () => {
    const text = await api("/voting-policies");
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 32: get_revenue_segments
// ---------------------------------------------------------------------------

server.tool(
  "get_revenue_segments",
  "Get revenue segment breakdown for an NZX company. Returns IFRS 8 operating, geographic, or product segment data including segment revenue, operating profit, assets (all in NZD thousands), and revenue percentage. Extracted from annual report PDFs. Use for 'revenue breakdown for [company]', 'business segments', 'divisions', 'product groups', 'geographic revenue split', 'segment analysis'. Multi-segment companies like FPH (Hospital/Homecare), MEL (Wholesale/Retail), FBU (Building Products/Construction/Distribution).",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'FPH', 'SKC', 'MEL', 'FBU')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year (e.g. '2025') or range (e.g. '2020-2025')"),
    type: z
      .string()
      .optional()
      .describe("Segment type filter: operating, geographic, product"),
    limit: z
      .number()
      .min(1)
      .max(200)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ ticker, year, type, limit }) => {
    const text = await api(`/segments/${ticker.toUpperCase()}`, {
      year,
      type,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 33: list_alert_subscriptions
// ---------------------------------------------------------------------------

server.tool(
  "list_alert_subscriptions",
  "List all alert subscriptions for the authenticated user. Each subscription filters market signals and anomalies by tickers, sectors, signal types (insider_trade, capital_raise, dividend, earnings, agm_result, director_change, grs_change, technical_signal, credit_rating, audit_change, takeover), anomaly categories (insider, governance, financial, market, agm, corporate), and severity levels — then delivers via webhook with HMAC-SHA256 signing. Enterprise tier required.",
  {},
  async () => {
    const text = await api("/alerts/subscriptions");
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 34: get_capital_raises
// ---------------------------------------------------------------------------

server.tool(
  "get_capital_raises",
  "Get capital raise history for an NZX company. 11,088 events across 130 issuers. Includes placements, rights issues, SPPs, IPOs, bonds, buybacks, DRPs, options exercises, employee schemes, and conversions. Returns shares issued, price, total amount (NZD), discount %, dilution %, purpose. Use for 'capital raises for [company]', 'how much has [company] raised?', 'buyback history', 'dilution risk'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FBU', 'RYM')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year (e.g. '2025') or range (e.g. '2020-2025')"),
    type: z
      .string()
      .optional()
      .describe("Comma-separated raise types: placement, rights_issue, spp, ipo, bond, buyback, drp, options_exercise, employee_scheme, conversion"),
    buybacks: z
      .string()
      .optional()
      .describe("Set to 'true' to only show buybacks"),
    limit: z.number().min(1).max(200).optional().describe("Number of results (default 50)"),
  },
  async ({ ticker, year, type, buybacks, limit }) => {
    const text = await api(`/capital-raises/${ticker.toUpperCase()}`, { year, type, buybacks, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 35: get_semantic_search
// ---------------------------------------------------------------------------

server.tool(
  "get_semantic_search",
  "Search 64,000+ NZX announcements using AI semantic search. Uses text-embedding-3-small vectors with hybrid keyword+semantic+reranking for best results. Finds conceptual matches that keyword search misses (e.g. 'climate risk' finds 'environmental exposure'). Returns relevance-ranked results with similarity scores and text snippets.",
  {
    q: z.string().describe("Search query (e.g. 'climate risk disclosure', 'CEO succession planning', 'covenant breach')"),
    ticker: z
      .string()
      .optional()
      .describe("Filter by company ticker (e.g. 'AIR')"),
    type: z
      .string()
      .optional()
      .describe("Filter by announcement type (e.g. 'GENERAL', 'FLLYR')"),
    from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    to: z.string().optional().describe("End date in YYYY-MM-DD format"),
    limit: z.number().min(1).max(50).optional().describe("Number of results (default 10)"),
  },
  async ({ q, ticker, type, from, to, limit }) => {
    const text = await api("/semantic-search", {
      q,
      ticker,
      type,
      from,
      to,
      limit: limit || 10,
      mode: "hybrid",
      rerank: "true",
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 36: get_iod_designations
// ---------------------------------------------------------------------------

server.tool(
  "get_iod_designations",
  "Get Institute of Directors (IoD) designated directors serving on NZX boards. Shows CFInstD (Chartered Fellow — highest designation), CMInstD (Chartered Member), CDir (Chartered Director), and MInstD (Member). Returns current board seats, chair status, gender, and summary statistics. Use for 'IoD directors at [company]', 'chartered directors', 'governance credentials', 'CFInstD directors', 'professional director qualifications'.",
  {
    designation: z
      .string()
      .optional()
      .describe("Filter by IoD designation: 'CFInstD', 'CMInstD', 'CDir', 'MInstD'"),
    ticker: z
      .string()
      .optional()
      .describe("Filter by NZX ticker to see IoD directors at a specific company (e.g. 'FPH')"),
    name: z
      .string()
      .optional()
      .describe("Search by director name"),
    limit: z
      .number()
      .min(1)
      .max(200)
      .optional()
      .describe("Number of results (default 50)"),
  },
  async ({ designation, ticker, name, limit }) => {
    const text = await api("/iod-designations", {
      designation,
      ticker: ticker?.toUpperCase(),
      name,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 37: get_board_skills_matrix
// ---------------------------------------------------------------------------

server.tool(
  "get_board_skills_matrix",
  "Get the board skills matrix for an NZX company. Shows per-director skills across 12 IoD NZ/ASX CGC categories (finance, legal, technology, industry, governance, risk, strategy, HR, sustainability, digital, international, marketing), board-level gap analysis (critical/single_point/depth_gap/adequate), and diversity score. Use for 'board skills at [company]', 'skills matrix', 'board gaps', 'director competencies', 'governance capability'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'FPH', 'AIR')"),
  },
  async ({ ticker }) => {
    const text = await api(`/skills-matrix/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 38: get_research_briefing
// ---------------------------------------------------------------------------

server.tool(
  "get_research_briefing",
  "Get a comprehensive investment research briefing for an NZX company. Assembles data from 15+ sources (governance, financials, insider activity, dividends, board, earnings, credit, performance, capital raises, announcements) with AI narrative synthesis. Supports 4 templates: 'general' (default), 'investment_thesis', 'due_diligence', 'board_meeting'. Use for 'research report on [company]', 'investment thesis for [ticker]', 'due diligence on [company]', 'company research briefing'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'FPH', 'AIR')"),
    template: z
      .enum(["general", "investment_thesis", "due_diligence", "board_meeting"])
      .optional()
      .describe("Research template (default: 'general')"),
    focus: z
      .string()
      .optional()
      .describe("Comma-separated focus areas (e.g. 'dividends,governance,insider activity')"),
  },
  async ({ ticker, template, focus }) => {
    const text = await api(`/research/${ticker.toUpperCase()}`, {
      template,
      focus,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 39: get_fund_votes
// ---------------------------------------------------------------------------

server.tool(
  "get_fund_votes",
  "Get actual voting records from NZ fund managers (Harbour, Devon, Mint, Fisher, NZ Super Fund) for an NZX company. Shows how institutional investors voted on AGM resolutions — FOR, AGAINST, or ABSTAIN. Includes ISS recommendations and management recommendations. Use for 'how did funds vote on [company]', 'fund voting records', 'institutional votes', 'AGM voting', 'proxy votes'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'AIR', 'FPH')"),
    fund_manager: z
      .string()
      .optional()
      .describe("Filter by fund manager name (e.g. 'Harbour', 'Devon', 'NZ Super')"),
    year: z
      .string()
      .optional()
      .describe("Filter by year (e.g. '2024') or range (e.g. '2023-2025')"),
    vote: z
      .string()
      .optional()
      .describe("Filter by vote cast (FOR, AGAINST, ABSTAIN)"),
  },
  async ({ ticker, fund_manager, year, vote }) => {
    const text = await api(`/fund-votes/${ticker.toUpperCase()}`, {
      fund_manager,
      year,
      vote,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 40: get_announcement_sentiment
// ---------------------------------------------------------------------------

server.tool(
  "get_announcement_sentiment",
  "Get AI-scored sentiment analysis of NZX company announcements. Returns per-announcement sentiment scores (-1 to +1), confidence levels, hedging analysis, buried risks, key topics, and guidance direction. Includes company-level summary with average score, sentiment breakdown, and overall rating. Use for 'sentiment on [company] announcements', 'what is the tone of [ticker] filings', 'buried risks in [company] announcements', 'announcement sentiment', 'hedging language'.",
  {
    ticker: z
      .string()
      .describe("NZX ticker symbol (e.g. 'AIR', 'FPH')"),
    sentiment: z
      .string()
      .optional()
      .describe("Filter by sentiment: positive, negative, neutral, mixed"),
    hedging: z
      .string()
      .optional()
      .describe("Filter by hedging level: none, low, moderate, heavy"),
    from: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM-DD)"),
    to: z
      .string()
      .optional()
      .describe("End date (YYYY-MM-DD)"),
    limit: z
      .number()
      .optional()
      .describe("Max results (default 20)"),
  },
  async ({ ticker, sentiment, hedging, from, to, limit }) => {
    const text = await api(`/sentiment/${ticker.toUpperCase()}`, {
      sentiment,
      hedging,
      from,
      to,
      limit,
    });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 40: get_ir_quality
// ---------------------------------------------------------------------------

server.tool(
  "get_ir_quality",
  "Get the IR (Investor Relations) disclosure quality score for an NZX company. Scores 5 dimensions: Timeliness (OECD/NZX Rule 10.4.1), Completeness (CFA DQI/S&P T&D), Readability (Loughran-McDonald proxy), Frequency (NIRI Standards), Governance Transparency (S&P T&D/GRS v2). Composite score 0-100, rating A+ to D, trajectory improving/stable/declining. 131 issuers scored. Use for 'how good is [company] at disclosure?', 'IR quality for [company]', 'disclosure quality', 'transparency score'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'MEL')"),
  },
  async ({ ticker }) => {
    const text = await api(`/ir-quality/${ticker.toUpperCase()}`, {});
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 41: get_peer_mentions
// ---------------------------------------------------------------------------

server.tool(
  "get_peer_mentions",
  "Get peer mentions for an NZX company — cross-company references extracted from 62,000+ NZX announcements. Shows which companies mention this ticker and which companies it references, with context snippets and network summary. Use for 'who mentions [company]?', 'business relationships for [company]', 'competitive peers', 'peer network'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'AIR', 'FPH', 'SPK')"),
    direction: z
      .enum(["mentions", "mentioned_by", "both"])
      .optional()
      .describe("Filter: 'mentions' (who this company references), 'mentioned_by' (who references it), or 'both' (default)"),
  },
  async ({ ticker, direction }) => {
    const text = await api(`/peer-mentions/${ticker.toUpperCase()}`, { direction });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 42: get_political_connections
// ---------------------------------------------------------------------------

server.tool(
  "get_political_connections",
  "Get political connections for an NZX company. Returns MP interests (gifts, hospitality, shareholdings, travel mentioning this company from the NZ Parliamentary Register of Interests), political donors linked to the company or its directors, and party donation records from the Electoral Commission (2019-2024). Use for 'political connections for [company]', 'which MPs are connected to [company]?', 'do any directors donate to political parties?', 'political exposure'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'SKC', 'AIR', 'SAN')"),
  },
  async ({ ticker }) => {
    const text = await api(`/political-connections/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 43: get_management_team
// ---------------------------------------------------------------------------

server.tool(
  "get_management_team",
  "Get the management team (C-suite executives) for an NZX company. Returns current CEO, CFO, COO, CTO, and other senior executives with roles, tenure, biographies, and profile links. 127 issuers covered, 508 current executives across 15 normalized roles (CEO, CFO, COO, CTO, CIO, CLO, CPO, CMO, CRO, CDO, CS, GM, VP, MD, Other). Use for 'who is the CEO of [company]?', 'management team for [ticker]', 'C-suite at [company]', 'executive leadership'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'FPH', 'AIR', 'SPK')"),
    role: z.string().optional().describe("Filter by normalized role (e.g. 'CEO', 'CFO', 'COO', 'CTO')"),
  },
  async ({ ticker, role }) => {
    const params = role ? `?role=${encodeURIComponent(role)}` : "";
    const text = await api(`/management-team/${ticker.toUpperCase()}${params}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 44: get_beneficial_ownership
// ---------------------------------------------------------------------------

server.tool(
  "get_beneficial_ownership",
  "Get beneficial ownership intelligence for an NZX company. Sees through custodian nominees (HSBC, BNP Paribas, Citibank) to identify actual fund managers behind NZX shareholdings. Returns fund manager positions, custodian mappings, and fund holdings from factsheet data. 56 fund managers tracked, covering ETF providers, KiwiSaver managers, sovereign wealth funds, and international institutional investors. Use for 'who owns [company]?', 'beneficial ownership', 'which fund managers hold [ticker]?', 'institutional ownership', 'custodian nominees'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'FPH', 'AIR', 'SPK')"),
  },
  async ({ ticker }) => {
    const text = await api(`/beneficial-ownership/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 45: get_substantial_holder_notices
// ---------------------------------------------------------------------------

server.tool(
  "get_substantial_holder_notices",
  "Get classified substantial holder notices (SPH) for an NZX company. Returns all substantial product holder notices with extracted holder names, percentage holdings, direction (increase/decrease/initial/ceased), and fund manager matching. 9,700+ notices classified from NZX SHINTR announcements. Use for 'substantial holders of [ticker]', 'SPH notices', 'who increased holdings in [company]?', 'recent ownership changes', 'substantial product holder movements'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'FPH', 'AIR', 'SPK')"),
    direction: z.enum(["increase", "decrease", "initial", "ceased"]).optional().describe("Filter by direction of holding change"),
    limit: z.number().optional().describe("Max results (default 50)"),
  },
  async ({ ticker, direction, limit }) => {
    const text = await api(`/substantial-holders/${ticker.toUpperCase()}/notices`, { direction, limit });
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 46: get_corporate_giving
// ---------------------------------------------------------------------------

server.tool(
  "get_corporate_giving",
  "Get corporate donations, sponsorships, and community investment for an NZX company. Shows recipients, amounts, donation types (cash/sponsorship/community_investment/grant/in-kind), foundation name, and total community investment. Cross-linked to registered charities where possible. Use for 'what charities does [company] support?', 'corporate giving', 'community investment', 'sponsorship', 'donations by [ticker]'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'SPK', 'AIR', 'GMT')"),
  },
  async ({ ticker }) => {
    const text = await api(`/corporate-giving/${ticker.toUpperCase()}`);
    return { content: [{ type: "text" as const, text }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 47: get_property_portfolio
// ---------------------------------------------------------------------------

server.tool(
  "get_property_portfolio",
  "Get property portfolio data for an NZX-listed REIT or property company. Returns individual properties with addresses, book values, cap rates, WALE, occupancy, major tenants, geocoded locations, plus summary stats (total value, avg cap rate, avg WALE, avg occupancy), type/regional breakdowns, top tenants, and development pipeline. Covers ~10 property companies (KPG, ARG, PFI, VHP, IPL, SPG, CDI, GMT, PCT, APL). Use for 'property portfolio', 'REIT assets', 'commercial property', 'cap rate', 'WALE', 'occupancy', 'tenant exposure'.",
  {
    ticker: z.string().describe("NZX ticker symbol (e.g. 'KPG', 'GMT', 'PFI', 'ARG')"),
  },
  async ({ ticker }) => {
    const text = await api(`/property-portfolio/${ticker.toUpperCase()}`);
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
