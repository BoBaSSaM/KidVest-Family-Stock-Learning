import YahooFinance from "yahoo-finance2";
import type { Stock, StockChart } from "@workspace/api-client-react";
import { HttpError } from "./domain";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const cache = new Map<string, { expires: number; value?: unknown; pending?: Promise<unknown> }>();
export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const found = cache.get(key);
  if (found && found.expires > Date.now()) {
    if (found.pending) return found.pending as Promise<T>;
    return found.value as T;
  }
  if (cache.size > 1000) for (const [k, v] of cache) if (v.expires < Date.now()) cache.delete(k);
  const pending = fetcher().then(value => {
    cache.set(key, { expires: Date.now() + 60000, value });
    return value;
  }).catch(error => { cache.delete(key); throw error; });
  cache.set(key, { expires: Date.now() + 60000, pending });
  return pending;
}
type Sample = { symbol: string; name: string; price: number; change: number; category: string; summary: string };
const samples: Sample[] = [
  { symbol: "AAPL", name: "Apple", price: 227.55, change: 1.42, category: "Technology", summary: "Apple makes devices like the iPhone, iPad and Mac, along with apps and services. Owning a share means owning a tiny part of this business." },
  { symbol: "DIS", name: "Walt Disney", price: 112.84, change: 2.14, category: "Entertainment", summary: "Disney creates films and shows and runs theme parks. Its business earns money from many different kinds of entertainment." },
  { symbol: "GOOGL", name: "Alphabet", price: 185.67, change: 0.85, category: "Technology", summary: "Alphabet is the parent company of Google and YouTube. It earns much of its money from advertising." },
  { symbol: "NKE", name: "Nike", price: 73.42, change: -0.64, category: "Sports & lifestyle", summary: "Nike designs sports shoes, clothing and equipment. A popular product does not guarantee that a stock will rise." },
  { symbol: "MSFT", name: "Microsoft", price: 421.50, change: 1.20, category: "Technology", summary: "Microsoft makes software, Xbox and cloud computing services that other businesses use." },
  { symbol: "RBLX", name: "Roblox", price: 67.28, change: 3.21, category: "Gaming", summary: "Roblox runs a platform where people create and play games. Company results and share prices can change." },
  { symbol: "AMZN", name: "Amazon", price: 218.94, change: -0.32, category: "Shopping", summary: "Amazon runs an online store, delivery services and cloud computing. Its business is more than shopping." },
  { symbol: "TSLA", name: "Tesla", price: 349.20, change: 2.35, category: "Electric vehicles", summary: "Tesla makes electric vehicles, batteries and energy products. Its stock can change in price quickly." },
  { symbol: "SBUX", name: "Starbucks", price: 92.64, change: 0.72, category: "Food & drink", summary: "Starbucks runs coffee shops around the world. Sales, costs and competition affect its business." },
  { symbol: "NVDA", name: "NVIDIA", price: 142.87, change: 2.76, category: "Technology", summary: "NVIDIA designs computer chips used for gaming and artificial intelligence. Growth is never guaranteed." },
  { symbol: "KO", name: "Coca-Cola", price: 68.75, change: 0.23, category: "Food & drink", summary: "Coca-Cola sells drinks through a large network of partners. Every company has risks." },
  { symbol: "SPOT", name: "Spotify", price: 485.32, change: -1.21, category: "Entertainment", summary: "Spotify helps people listen to music and podcasts. It earns money from subscriptions and advertising." },
];
function normalizeSymbol(input: string) {
  const s = input.trim().toUpperCase();
  if (!/^[A-Z0-9^][A-Z0-9.^=-]{0,19}$/.test(s)) throw new HttpError(400, "Enter a valid stock ticker.");
  return s;
}
function demoQuote(s: Sample): Stock {
  return { ...s, change: +(s.price * s.change / 100).toFixed(2), changePercent: s.change, currency: "USD", source: "demo", updatedAt: "2026-10-18T16:00:00.000Z", marketState: "DEMO" };
}
export async function quote(input: string, demo = false): Promise<Stock> {
  const symbol = normalizeSymbol(input);
  if (demo) {
    const item = samples.find(s => s.symbol === symbol);
    if (item) return demoQuote(item);
    // Unknown symbols use Yahoo, never invented sample prices.
  }
  try {
    return await cached(`quote:${symbol}`, async () => {
      const result = await yahoo.quote(symbol);
      if (!result.regularMarketPrice || result.regularMarketPrice <= 0) throw new Error("Missing quote");
      return {
        symbol: result.symbol, name: result.shortName || result.longName || symbol,
        price: result.regularMarketPrice,
        change: result.regularMarketChange || 0, changePercent: result.regularMarketChangePercent || 0,
        currency: result.currency || "USD",
        summary: samples.find(s => s.symbol === symbol)?.summary || `${result.longName || result.shortName || symbol} is a publicly traded company. A share is a small ownership stake. Prices can go down as well as up. Research the business with your parent before requesting an investment.`,
        category: result.quoteType || "Stock", source: "live" as const,
        updatedAt: result.regularMarketTime?.toISOString() || new Date().toISOString(),
        marketState: result.marketState || "UNKNOWN",
      };
    });
  } catch { throw new HttpError(503, "Market data is temporarily unavailable for this ticker. Please try again later. No sample price has been substituted."); }
}
export async function popular(demo = false): Promise<Stock[]> {
  if (demo) return samples.map(demoQuote);
  const result = await Promise.allSettled(samples.slice(0, 8).map(s => quote(s.symbol)));
  const stocks = result.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
  if (!stocks.length) throw new HttpError(503, "Market data is unavailable. Please try again later.");
  return stocks;
}
export async function search(query: string, demo = false): Promise<Stock[]> {
  const q = query.trim();
  if (q.length < 1 || q.length > 80) throw new HttpError(400, "Search using 1–80 characters.");
  if (demo) {
    const matches = samples.filter(s => `${s.symbol} ${s.name}`.toLowerCase().includes(q.toLowerCase()));
    if (matches.length) return matches.map(demoQuote);
  }
  try {
    return await cached(`search:${q.toLowerCase()}`, async () => {
      const result = await yahoo.search(q, { quotesCount: 12, newsCount: 0 });
      const symbols = result.quotes.flatMap(r => "symbol" in r && typeof r.symbol === "string" && ["EQUITY", "ETF"].includes(String(r.quoteType)) ? [r.symbol] : []).slice(0, 12);
      const quotes = await Promise.allSettled(symbols.map(s => quote(s)));
      return quotes.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
    });
  } catch { throw new HttpError(503, "Stock search is temporarily unavailable. Please try again later."); }
}
export async function chart(input: string, range: string, demo = false): Promise<StockChart> {
  const symbol = normalizeSymbol(input);
  if (!["1D", "1W", "1M", "1Y"].includes(range)) throw new HttpError(400, "Choose a valid chart range.");
  if (demo && samples.some(s => s.symbol === symbol)) {
    const price = samples.find(s => s.symbol === symbol)!.price;
    const count = range === "1D" ? 24 : range === "1W" ? 7 : range === "1M" ? 30 : 52;
    const step = range === "1D" ? 3600000 : range === "1Y" ? 7 * 86400000 : 86400000;
    return {
      source: "demo",
      points: Array.from({ length: count }, (_, i) => ({
        date: new Date(Date.parse("2026-10-18T16:00:00Z") - (count - 1 - i) * step).toISOString(),
        value: +(price * (0.91 + 0.09 * i / (count - 1) + (i === count - 1 ? 0 : Math.sin(i * 1.9) * 0.008))).toFixed(2),
      })),
    };
  }
  try {
    return await cached(`chart:${symbol}:${range}`, async () => {
      const days = { "1D": 2, "1W": 7, "1M": 31, "1Y": 366 }[range]!;
      const result = await yahoo.chart(symbol, { period1: new Date(Date.now() - days * 86400000), interval: range === "1D" ? "15m" : "1d" });
      const points = result.quotes.flatMap(r => r.close != null ? [{ date: r.date.toISOString(), value: r.close }] : []);
      if (!points.length) throw new Error("No chart data");
      return { source: "live" as const, points };
    });
  } catch { throw new HttpError(503, "Historical prices are unavailable for this range. Please try a different range."); }
}
