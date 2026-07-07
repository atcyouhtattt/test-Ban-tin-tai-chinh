export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'Thiếu mã cổ phiếu' });
  const tk = ticker.toUpperCase().trim();
  const KEY = process.env.GEMINI_KEY || '';
  if (!KEY) return res.status(500).json({ error: 'GEMINI_KEY chưa cài trong Vercel Settings' });

  try {
    // ═══ 1. GIÁ REALTIME TỪ ENTRADE (nguồn vnstock) ═══
    const price = await getPrice(tk);

    // ═══ 2. CHỈ SỐ TÀI CHÍNH TỪ NHIỀU NGUỒN ═══
    const fundData = await getFundamentals(tk);

    // ═══ 3. GEMINI CHỈ VIẾT TEXT PHÂN TÍCH (KHÔNG BỊA SỐ) ═══
    const models = await listModels(KEY);
    const analysis = models.length ? await callGemini(tk, KEY, models, price, fundData) : null;

    // ═══ 4. GỘP: SỐ LIỆU TỪ API, TEXT TỪ GEMINI ═══
    const result = buildResult(tk, price, fundData, analysis);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ═══ GIÁ REALTIME QUA ENTRADE/DNSE ═══
async function getPrice(tk) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 15 * 86400;
  try {
    const r = await fetch(`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${tk}&resolution=1D`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (d.c && d.c.length > 0) {
        const n = d.c.length - 1;
        return { price: d.c[n] * 1000, high: d.h[n] * 1000, low: d.l[n] * 1000, volume: d.v[n], date: new Date(d.t[n] * 1000).toISOString().slice(0, 10) };
      }
    }
  } catch (e) {}
  return null;
}

// ═══ CHỈ SỐ TÀI CHÍNH — THỬ NHIỀU NGUỒN ═══
async function getFundamentals(tk) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' };
  const timeout = { signal: AbortSignal.timeout(8000) };
  let fund = {};

  // ══ NGUỒN 1: WICHART SSI ══
  try {
    const r = await fetch(`https://iboard-query.ssi.com.vn/v2/stock/type/s/symbol/${tk}`, { headers, ...timeout });
    if (r.ok) {
      const d = await r.json();
      const s = d?.data || d;
      if (s && (s.ss || s.stockSymbol)) {
        fund.company_name = s.organName || s.stockName;
        fund.exchange = s.exchange || s.comGroupCode;
        fund.market_cap_bn = s.marketCap ? +(s.marketCap / 1e9).toFixed(0) : null;
        fund.eps = s.eps || null;
        fund.pe = s.pe || null;
        fund.pb = s.pb || null;
        fund.high_52w = s.highPrice52Week || s.highest || null;
        fund.low_52w = s.lowPrice52Week || s.lowest || null;
        fund.beta = s.beta || null;
        fund.shares_m = s.sharesOutstanding || null;
        fund.free_float_pct = s.freeFloat ? +(s.freeFloat).toFixed(1) : null;
        fund.api_ok = true;
        fund.api_source = 'SSI';
        console.log('SSI OK:', JSON.stringify(s).substring(0, 200));
      }
    }
  } catch (e) { console.log('SSI fail:', e.message); }

  // ══ NGUỒN 2: FIREANT ══
  if (!fund.api_ok) {
    try {
      const r = await fetch(`https://restv2.fireant.vn/symbols/${tk}/fundamental`, { headers: { ...headers, 'Authorization': 'Bearer guest' }, ...timeout });
      if (r.ok) {
        const d = await r.json();
        if (d) {
          fund.company_name = d.companyName;
          fund.sector = d.industry;
          fund.eps = d.eps || null;
          fund.pe = d.pe || null;
          fund.pb = d.pb || null;
          fund.roe_pct = d.roe != null ? +(d.roe * 100).toFixed(1) : null;
          fund.roa_pct = d.roa != null ? +(d.roa * 100).toFixed(1) : null;
          fund.market_cap_bn = d.marketCap ? +(d.marketCap / 1e9).toFixed(0) : null;
          fund.beta = d.beta || null;
          fund.api_ok = true;
          fund.api_source = 'Fireant';
          console.log('Fireant OK:', JSON.stringify(d).substring(0, 200));
        }
      }
    } catch (e) { console.log('Fireant fail:', e.message); }
  }

  // ══ NGUỒN 3: TCBS ══
  if (!fund.api_ok) {
    try {
      const r = await fetch(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/${tk}/overview`, { headers, ...timeout });
      if (r.ok) {
        const d = await r.json();
        if (d && (d.ticker || d.companyName)) {
          fund.company_name = d.companyName || d.shortName;
          fund.exchange = d.exchange;
          fund.sector = d.industry || d.industryEn;
          fund.market_cap_bn = d.marketCap ? +(d.marketCap / 1e9).toFixed(0) : null;
          fund.shares_m = d.outstandingShare || d.issueShare || null;
          fund.free_float_pct = d.freeFloat ? +(d.freeFloat * 100).toFixed(1) : null;
          fund.high_52w = d.week52High || null;
          fund.low_52w = d.week52Low || null;
          fund.beta = d.beta || null;
          fund.profile = d.companyProfile;
          fund.api_ok = true;
          fund.api_source = 'TCBS';
          console.log('TCBS OK');
        }
      }
    } catch (e) { console.log('TCBS fail:', e.message); }
  }

  // ══ NGUỒN 4: TCBS Financial Ratio ══
  if (!fund.eps) {
    try {
      const r = await fetch(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/finance/${tk}/financialratio?yearly=1&isAll=false`, { headers, ...timeout });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr) && arr.length > 0) {
          const last = arr[arr.length - 1];
          fund.eps = fund.eps || last.earningPerShare || null;
          fund.pe = fund.pe || last.priceToEarning || null;
          fund.pb = fund.pb || last.priceToBook || null;
          fund.roe_pct = fund.roe_pct || (last.roe != null ? +(last.roe * 100).toFixed(1) : null);
          fund.roa_pct = fund.roa_pct || (last.roa != null ? +(last.roa * 100).toFixed(1) : null);
          fund.ev_ebitda = last.evToEbitda || null;
          fund.dividend_yield_pct = last.dividendYield != null ? +(last.dividendYield * 100).toFixed(1) : null;
          fund.nim_pct = last.nim != null ? +(last.nim * 100).toFixed(1) : null;
          console.log('TCBS ratio OK');
        }
      }
    } catch (e) { console.log('TCBS ratio fail:', e.message); }
  }

  // ══ NGUỒN 5: TCBS Income Statement ══
  try {
    const r = await fetch(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/finance/${tk}/incomestatement?yearly=1&isAll=false`, { headers, ...timeout });
    if (r.ok) {
      const arr = await r.json();
      if (Array.isArray(arr) && arr.length > 0) {
        fund.financials = arr.slice(-4).map(f => ({
          year: String(f.year || ''),
          revenue_bn: f.revenue != null ? +(f.revenue / 1e9).toFixed(1) : null,
          net_profit_bn: f.shareHolderIncome != null ? +(f.shareHolderIncome / 1e9).toFixed(1) : (f.netProfit != null ? +(f.netProfit / 1e9).toFixed(1) : null),
        }));
        console.log('TCBS income OK');
      }
    }
  } catch (e) { console.log('TCBS income fail:', e.message); }

  // ══ NGUỒN 6: VNDirect ratios ══
  if (!fund.eps) {
    try {
      const r = await fetch(`https://finfo-api.vndirect.com.vn/v4/ratios/latest?filter=itemCode:51000,51003,51006,51008,51010,51012&where=code:${tk}&order=reportDate`, { headers, ...timeout });
      if (r.ok) {
        const d = await r.json();
        if (d.data && d.data.length > 0) {
          for (const item of d.data) {
            if (item.itemCode === '51006') fund.eps = fund.eps || item.value;
            if (item.itemCode === '51003') fund.pe = fund.pe || item.value;
            if (item.itemCode === '51012') fund.pb = fund.pb || item.value;
            if (item.itemCode === '51010') fund.roe_pct = fund.roe_pct || +(item.value).toFixed(1);
            if (item.itemCode === '51008') fund.roa_pct = fund.roa_pct || +(item.value).toFixed(1);
          }
          fund.api_source = (fund.api_source || '') + '+VND';
          console.log('VND ratios OK');
        }
      }
    } catch (e) { console.log('VND ratios fail:', e.message); }
  }

  console.log('Final fund source:', fund.api_source || 'NONE', '| eps:', fund.eps, '| pe:', fund.pe);
  return fund;
}

function buildResult(tk, price, fund, analysis) {
  const a = analysis || {};
  return {
    ticker: tk,
    company_name: fund.company_name || a.company_name || tk,
    exchange: fund.exchange || a.exchange || 'HOSE',
    sector: fund.sector || a.sector || '',
    current_price: price ? price.price : (a.current_price || 0),
    price_date: price ? price.date : null,
    target_price: a.target_price || 0,
    upside_pct: (a.target_price && price && price.price) ? +(((a.target_price - price.price) / price.price) * 100).toFixed(1) : (a.upside_pct || 0),
    recommendation: a.recommendation || 'NẮM GIỮ',
    // Chỉ số: ưu tiên API > Gemini
    market_cap_bn: fund.market_cap_bn || a.market_cap_bn || null,
    shares_m: fund.shares_m || a.shares_m || null,
    free_float_pct: fund.free_float_pct || a.free_float_pct || null,
    high_52w: fund.high_52w || a.high_52w || null,
    low_52w: fund.low_52w || a.low_52w || null,
    beta: fund.beta || a.beta || null,
    eps: fund.eps || a.eps || null,
    pe: fund.pe || a.pe || null,
    pb: fund.pb || a.pb || null,
    roe_pct: fund.roe_pct != null ? fund.roe_pct : (a.roe_pct || null),
    roa_pct: fund.roa_pct != null ? fund.roa_pct : (a.roa_pct || null),
    dividend_yield_pct: fund.dividend_yield_pct || a.dividend_yield_pct || null,
    ev_ebitda: fund.ev_ebitda || a.ev_ebitda || null,
    nim_pct: fund.nim_pct != null ? fund.nim_pct : (a.nim_pct != null ? a.nim_pct : null),
    car_pct: a.car_pct || null,
    npl_pct: a.npl_pct || null,
    financials: fund.financials || a.financials || [],
    forecast: a.forecast || [],
    shareholders: a.shareholders || [],
    description: a.description || fund.profile || '',
    business_segments: a.business_segments || '',
    recent_results: a.recent_results || '',
    outlook: a.outlook || '',
    valuation_method: a.valuation_method || '',
    valuation_rationale: a.valuation_rationale || '',
    risks: a.risks || [],
    catalysts: a.catalysts || [],
    industry_context: a.industry_context || '',
    key_projects: a.key_projects || '',
    data_source: (price ? 'Entrade (realtime)' : '') + (fund.api_source ? ' + ' + fund.api_source + ' (chỉ số)' : '') + ' + Gemini AI (phân tích)',
  };
}

async function listModels(key) {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace('models/', '')).filter(m => m.includes('pro')).sort((a, b) => b.localeCompare(a));
  } catch { return []; }
}

async function callGemini(tk, key, models, price, fund) {
  const priceStr = price ? `${price.price.toLocaleString('vi-VN')}đ (${price.date})` : 'chưa có';
  const fundStr = fund.eps ? `EPS=${fund.eps}, PE=${fund.pe}, PB=${fund.pb}, ROE=${fund.roe_pct}%` : 'chưa có từ API';

  const prompt = `Bạn là Giám đốc Phân tích tại CTCK hàng đầu Việt Nam. Viết BÁO CÁO PHÂN TÍCH cho mã ${tk}.

DỮ LIỆU ĐÃ CÓ SẴN (KHÔNG CẦN TÌM LẠI):
- Giá: ${priceStr}
- Chỉ số: ${fundStr}

NHIỆM VỤ CỦA BẠN: CHỈ viết phần TEXT phân tích. KHÔNG bịa số liệu tài chính. Nếu đề cập số liệu, dùng số liệu đã cho ở trên hoặc tìm kiếm xác minh qua Google Search.

TUYỆT ĐỐI KHÔNG dùng ký hiệu "&", luôn viết "và".

Trả về JSON thuần (KHÔNG markdown, KHÔNG backticks):

{"company_name":"Tên đầy đủ","ticker":"${tk}","exchange":"HOSE/HNX","sector":"Ngành","recommendation":"MUA/KHẢ QUAN/TÍCH LŨY/NẮM GIỮ/GIẢM TỶ TRỌNG/BÁN","target_price":0,"upside_pct":0,"forecast":[{"year":"2026E","revenue_bn":0,"net_profit_bn":0,"net_margin_pct":0},{"year":"2027F","revenue_bn":0,"net_profit_bn":0,"net_margin_pct":0}],"shareholders":[{"name":"Tên","pct":0}],"description":"6-8 câu chi tiết có số liệu","business_segments":"5-6 câu","recent_results":"6-8 câu KQKD mới nhất có số liệu cụ thể, so sánh cùng kỳ","outlook":"3 đoạn x 4-5 câu: triển vọng 2026, trung hạn, vĩ mô","valuation_method":"Phương pháp","valuation_rationale":"4-5 câu cơ sở định giá","risks":["2-3 câu chi tiết có số liệu","Rủi ro 2","Rủi ro 3","Rủi ro 4"],"catalysts":["2-3 câu có timeline","Xúc tác 2","Xúc tác 3"],"industry_context":"6-8 câu phân tích ngành","key_projects":"4-5 câu dự án trọng điểm"}

Năm hiện tại 2026. Viết chuyên nghiệp chuẩn CTCK.`;

  for (const model of models.slice(0, 5)) {
    for (const useSearch of [true, false]) {
      try {
        const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 8192 } };
        if (useSearch) body.tools = [{ google_search: {} }];
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) { const e = await r.json().catch(() => ({})); if ((e?.error?.message || '').match(/quota|429|limit/)) { if (useSearch) continue; else break; } continue; }
        const result = await r.json();
        let txt = '';
        for (const c of (result.candidates || [])) for (const p of (c?.content?.parts || [])) if (p.text) txt += p.text;
        if (!txt) continue;
        let cl = txt.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim().replace(/ & /g, ' và ');
        const i = cl.indexOf('{'), j = cl.lastIndexOf('}');
        if (i === -1) continue;
        return JSON.parse(cl.substring(i, j + 1));
      } catch { continue; }
    }
  }
  return null;
}
