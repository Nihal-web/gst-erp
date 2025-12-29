import { supabase } from '../supabaseClient';

export interface HSNSuggestion {
  hsnCode: string;
  gstRate: string;
  description: string;
  confidence: number;
  type: 'GOODS' | 'SERVICES';
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Cache configuration
const CACHE_KEY = 'hsn_search_cache_v3';
const CACHE_DURATION = 15 * 24 * 60 * 60 * 1000; // 15 days

function getFromCache(query: string): HSNSuggestion[] | null {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;
    const cache = JSON.parse(cacheStr);
    const entry = cache[query.toLowerCase().trim()];
    if (!entry || (Date.now() - entry.timestamp > CACHE_DURATION)) return null;
    return entry.results;
  } catch { return null; }
}

function saveToCache(query: string, results: HSNSuggestion[]): void {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY) || '{}';
    const cache = JSON.parse(cacheStr);
    cache[query.toLowerCase().trim()] = { results, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { }
}

// Cleaning logic to remove noise
function cleanProductQuery(query: string): string {
  return query.toLowerCase()
    .replace(/\d+(kg|gm|ltr|ml|pk|unit|pc|box|mm|feet|mtr)\b/gi, '') // remove units/dimensions
    .replace(/\b(branded|unbranded|loose|fresh|best|top|quality|pure|special|new|old)\b/gi, '') // remove adjectival noise
    .replace(/[^\w\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

async function searchInDatabase(query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('search_hsn_advanced', {
      search_query: query,
      match_limit: 5
    });

    if (error || !data || data.length === 0) return [];

    return data.map((item: any) => ({
      hsnCode: item.hsn_code,
      gstRate: item.gst_rate,
      description: item.product_name || item.description,
      confidence: Math.round(Math.min(item.relevance * 100, 99)),
      type: item.product_type
    }));
  } catch { return []; }
}

// Fallback to direct REST API to assume SDK issues
async function generateContentViaRest(model: string, prompt: string) {
  if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Helper to get a prioritized list of ALL working models
async function getPrioritizedModels(): Promise<string[]> {
  const defaults = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-pro'];
  if (!GEMINI_API_KEY) return defaults;

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const response = await fetch(listUrl);
    if (!response.ok) return defaults;

    const data = await response.json();
    const availableModels = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));

    // Preference order: Fast > Capability > Experimental > Legacy
    const priorityOrder = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

    // Sort available models based on our priority list
    const sorted = availableModels.sort((a: string, b: string) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      // If both are in priority list, lower index wins
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // If only A is in list, A wins
      if (idxA !== -1) return -1;
      // If only B is in list, B wins
      if (idxB !== -1) return 1;
      // Otherwise, keep original order (or sort alphabetically if persistent order needed)
      return 0;
    });

    return sorted.length > 0 ? sorted : defaults;
  } catch (e) {
    console.warn("Failed to list models, using defaults.", e);
    return defaults;
  }
}

async function fetchFromGemini(query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> {
  try {
    const prompt = `System: You are an expert Indian GST Consultant.
Task: Search the official GST HSN/SAC directory for: "${query}".
Context: User needs HSN for ${productType}.
Requirement:
- Provide the output in this specific JSON format:
{
  "product": "Product Name",
  "hsn_code": "Code",
  "details": {
    "description": "Official Description",
    "chapter": "Chapter Name",
    "gst_rate": "0%/5%/12%/18%/28%",
    "effective_date": "YYYY-MM-DD"
  },
  "related_codes": []
}
- Return ONLY the JSON object. No markdown.`;

    let textC = "";
    const candidates = await getPrioritizedModels();
    console.log("Attempting Gemini models in order:", candidates);

    let lastError;

    // Waterfall: Try models one by one until success
    for (const model of candidates) {
      try {
        console.log(`Trying model: ${model}...`);
        textC = await generateContentViaRest(model, prompt);
        if (textC) break; // Success!
      } catch (e: any) {
        console.warn(`Model ${model} failed:`, e.message || e);
        lastError = e;
        // Continue to next model in loop...
      }
    }

    if (!textC) {
      console.error("All Gemini models failed.", lastError);
      return [];
    }

    // Improved JSON extraction and Debugging
    console.log("AI Raw Response:", textC);

    // Attempt to find JSON object if wrapped in text
    const jsonMatch = textC.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : textC.replace(/```json|```/gi, '').trim();

    if (!jsonString) return [];

    let responseData;
    try {
      responseData = JSON.parse(jsonString);
    } catch (e) {
      console.warn("JSON Parse Failed:", e);
      return [];
    }

    // Map the rich response structure to our HSNSuggestion interface
    if (responseData && (responseData.hsn_code || responseData.hsnCode)) {
      const rawCode = responseData.hsn_code || responseData.hsnCode || '';
      const code = rawCode.replace(/[^0-9]/g, '').substring(0, 4); // Only first 4 digits
      const rate = responseData.details?.gst_rate || responseData.gstRate || '18%';
      const desc = responseData.details?.description || responseData.product || responseData.description;

      return [{
        hsnCode: code,
        gstRate: rate,
        description: desc,
        confidence: 95,
        type: productType
      }];
    }

    return Array.isArray(responseData) ? responseData : [];
  } catch (error) {
    console.error('Gemini AI Fetch Error:', error);
    return [];
  }
}

export const fetchHSNDetails = async (query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const cleaned = cleanProductQuery(normalizedQuery);

  // 1. Cache Check
  const cached = getFromCache(normalizedQuery) || getFromCache(cleaned);
  if (cached) return cached;

  // 2. Gemini AI Semantic Search (Prioritized)
  const aiResults = await fetchFromGemini(normalizedQuery, productType);
  if (aiResults.length > 0) {
    saveToCache(normalizedQuery, aiResults);
    return aiResults;
  }

  // 3. Database Fuzzy Search (Supabase)
  const dbResults = await searchInDatabase(cleaned, productType);
  if (dbResults.length > 0) {
    saveToCache(normalizedQuery, dbResults);
    return dbResults;
  }

  // Final static fallback
  return [
    {
      hsnCode: productType === 'GOODS' ? '9999' : '998399',
      gstRate: '18%',
      description: `${query} - Manual check required`,
      confidence: 40,
      type: productType
    }
  ];
};

export const clearHSNCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};
