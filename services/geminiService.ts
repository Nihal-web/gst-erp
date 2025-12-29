import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

export interface HSNSuggestion {
  hsnCode: string;
  gstRate: string;
  description: string;
  confidence: number;
  type: 'GOODS' | 'SERVICES';
}

// Clients configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let genAIInstance: any = null;

const getGenAI = () => {
  if (!genAIInstance && GEMINI_API_KEY) {
    try {
      genAIInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    } catch (e) {
      console.error("Failed to initialize Gemini AI", e);
    }
  }
  return genAIInstance;
};

// Comprehensive HSN/SAC Database - Works without API
const HSN_DATABASE: Record<string, HSNSuggestion[]> = {
  // FOOD & AGRICULTURE (Chapter 01-24)
  'milk': [
    { hsnCode: '0401', gstRate: '0%', description: 'Fresh Milk (Unprocessed)', confidence: 95, type: 'GOODS' },
    { hsnCode: '0402', gstRate: '5%', description: 'Milk Powder / Condensed Milk', confidence: 92, type: 'GOODS' },
    { hsnCode: '0404', gstRate: '12%', description: 'Flavoured Milk / Buttermilk', confidence: 90, type: 'GOODS' }
  ],
  'atta': [
    { hsnCode: '1101', gstRate: '0%', description: 'Loose/Unbranded Atta', confidence: 98, type: 'GOODS' },
    { hsnCode: '1101', gstRate: '5%', description: 'Pre-packaged & Labeled Atta (branded)', confidence: 95, type: 'GOODS' }
  ],
  'flour': [
    { hsnCode: '1101', gstRate: '0%', description: 'Wheat Flour (Atta)', confidence: 96, type: 'GOODS' },
    { hsnCode: '1102', gstRate: '5%', description: 'Maida (Refined Wheat Flour)', confidence: 94, type: 'GOODS' }
  ],
  'rice': [
    { hsnCode: '1006', gstRate: '0%', description: 'Unbranded Rice (loose)', confidence: 96, type: 'GOODS' },
    { hsnCode: '1006', gstRate: '5%', description: 'Branded/Packaged Rice', confidence: 94, type: 'GOODS' }
  ],
  'sugar': [
    { hsnCode: '1701', gstRate: '5%', description: 'White Sugar', confidence: 97, type: 'GOODS' },
    { hsnCode: '1701', gstRate: '18%', description: 'Cube Sugar', confidence: 91, type: 'GOODS' }
  ],
  'oil': [
    { hsnCode: '1507', gstRate: '5%', description: 'Soybean Oil', confidence: 95, type: 'GOODS' },
    { hsnCode: '1508', gstRate: '5%', description: 'Groundnut Oil', confidence: 94, type: 'GOODS' },
    { hsnCode: '1512', gstRate: '5%', description: 'Sunflower Oil', confidence: 95, type: 'GOODS' }
  ],
  'cement': [
    { hsnCode: '2523', gstRate: '28%', description: 'Portland Cement', confidence: 98, type: 'GOODS' },
    { hsnCode: '2523', gstRate: '28%', description: 'White Cement', confidence: 95, type: 'GOODS' }
  ],
  'steel': [
    { hsnCode: '7214', gstRate: '18%', description: 'Iron Bars / Steel Rods (TMT)', confidence: 96, type: 'GOODS' },
    { hsnCode: '7308', gstRate: '18%', description: 'Steel Structures', confidence: 92, type: 'GOODS' }
  ],
  'iron': [
    { hsnCode: '7214', gstRate: '18%', description: 'Iron Bars/Rods', confidence: 95, type: 'GOODS' }
  ],
  'mobile': [
    { hsnCode: '8517', gstRate: '18%', description: 'Mobile Phones', confidence: 98, type: 'GOODS' },
    { hsnCode: '8517', gstRate: '18%', description: 'Mobile Accessories', confidence: 91, type: 'GOODS' }
  ],
  'laptop': [
    { hsnCode: '8471', gstRate: '18%', description: 'Laptop / Notebook Computer', confidence: 97, type: 'GOODS' }
  ],
  'computer': [
    { hsnCode: '8471', gstRate: '18%', description: 'Desktop Computer', confidence: 96, type: 'GOODS' }
  ],
  'transport': [
    { hsnCode: '996511', gstRate: '5%', description: 'Goods Transport by Road', confidence: 94, type: 'SERVICES' }
  ],
  'software': [
    { hsnCode: '998314', gstRate: '18%', description: 'IT Software Services', confidence: 95, type: 'SERVICES' }
  ]
};

const SYNONYMS: Record<string, string[]> = {
  'mobile': ['phone', 'smartphone', 'cellphone', 'handset'],
  'laptop': ['notebook', 'laptop computer'],
  'atta': ['aata', 'wheat flour', 'gehun ka atta'],
  'flour': ['atta', 'maida', 'besan', 'rawa', 'sooji'],
  'rice': ['chawal', 'basmati'],
  'oil': ['tel', 'cooking oil', 'edible oil'],
  'cement': ['siment', 'sement'],
  'steel': ['sariya', 'loha', 'iron', 'tmt', 'rod'],
  'iron': ['loha', 'sariya']
};

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

async function fetchFromGemini(query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> {
  const ai = getGenAI();
  if (!ai) return [];

  try {
    const prompt = `Task: Act as an Indian GST Compliance Expert.
Entity Identification: Provide the most accurate 4-digit or 6-digit HSN (for Goods) or SAC (for Services) code for: "${query}".
Context: This is for a GST ERP system in India.
Constraints: 
- Type: ${productType}
- Response Format: Strict JSON array of objects.
- Maximum suggestions: 2
Format: [{"hsnCode": "string", "gstRate": "0%/5%/12%/18%/28%", "description": "concise matching desc", "confidence": number, "type": "${productType}"}]`;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    if (!cleanJson) return [];

    const suggestions = JSON.parse(cleanJson);
    return Array.isArray(suggestions) ? suggestions : [];
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

  // 2. Local Rich Database Check (Exact & Synonym)
  for (const [key, suggestions] of Object.entries(HSN_DATABASE)) {
    // Check key
    if (cleaned === key || cleaned.includes(key)) {
      saveToCache(normalizedQuery, suggestions);
      return suggestions;
    }
    // Check synonyms
    const synonyms = SYNONYMS[key] || [];
    if (synonyms.some(s => cleaned === s || cleaned.includes(s))) {
      saveToCache(normalizedQuery, suggestions);
      return suggestions;
    }
  }

  // 3. Database Fuzzy Search
  const dbResults = await searchInDatabase(cleaned, productType);
  if (dbResults.length > 0 && dbResults[0].confidence > 85) {
    saveToCache(normalizedQuery, dbResults);
    return dbResults;
  }

  // 4. Gemini AI Semantic Search
  const aiResults = await fetchFromGemini(normalizedQuery, productType);
  if (aiResults.length > 0) {
    saveToCache(normalizedQuery, aiResults);
    return aiResults;
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
