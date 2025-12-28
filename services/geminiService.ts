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

// Cache configuration
const CACHE_KEY = 'hsn_search_cache_v2';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Get from cache
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

// Save to cache
function saveToCache(query: string, results: HSNSuggestion[]): void {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY) || '{}';
    const cache = JSON.parse(cacheStr);
    cache[query.toLowerCase().trim()] = { results, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { }
}

// 1. Search in Database (Advanced Fuzzy Search)
async function searchInDatabase(query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('search_hsn_advanced', {
      search_query: query.trim(),
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

// 2. Fetch from Gemini AI (Semantic Search)
async function fetchFromGemini(query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> {
  const ai = getGenAI();
  if (!ai) return [];

  try {
    const prompt = `Identify the most accurate India GST HSN (for Goods) or SAC (for Services) code for: "${query}". 
    The item type is ${productType}.
    Return ONLY a JSON array of up to 3 suggestions in this format:
    [{"hsnCode": "string", "gstRate": "18%", "description": "short description", "confidence": 95, "type": "${productType}"}]`;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    // The SDK response structure usually has candidates[0].content.parts[0].text
    // but often provides a getter for text.
    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean JSON from markdown if present
    const cleanJson = text.replace(/```json|```/g, '').trim();
    if (!cleanJson) return [];

    const suggestions = JSON.parse(cleanJson);
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.error('Gemini AI Fetch Error:', error);
    return [];
  }
}

// 3. Fallback Local Database (Common Staples)
const FALLBACK_DATABASE: Record<string, HSNSuggestion[]> = {
  'atta': [{ hsnCode: '1101', gstRate: '0%', description: 'Wheat Flour (Atta) - Unbranded', confidence: 99, type: 'GOODS' }],
  'flour': [{ hsnCode: '1101', gstRate: '0%', description: 'Wheat Flour (Atta)', confidence: 98, type: 'GOODS' }],
  'rice': [{ hsnCode: '1006', gstRate: '0%', description: 'Rice (Unbranded)', confidence: 98, type: 'GOODS' }],
  'milk': [{ hsnCode: '0401', gstRate: '0%', description: 'Fresh Milk', confidence: 99, type: 'GOODS' }],
  'oil': [{ hsnCode: '1512', gstRate: '5%', description: 'Edible Vegetable Oil', confidence: 95, type: 'GOODS' }],
  'mobile': [{ hsnCode: '8517', gstRate: '18%', description: 'Mobile Phones', confidence: 99, type: 'GOODS' }],
  'laptop': [{ hsnCode: '8471', gstRate: '18%', description: 'Computers/Laptops', confidence: 99, type: 'GOODS' }],
  'cement': [{ hsnCode: '2523', gstRate: '28%', description: 'Portland Cement', confidence: 99, type: 'GOODS' }],
  'iron': [{ hsnCode: '7214', gstRate: '18%', description: 'Iron/Steel Bars (Saria)', confidence: 95, type: 'GOODS' }],
  'sugar': [{ hsnCode: '1701', gstRate: '5%', description: 'White Sugar', confidence: 98, type: 'GOODS' }],
  'service': [{ hsnCode: '9983', gstRate: '18%', description: 'Professional Services', confidence: 90, type: 'SERVICES' }],
  'software': [{ hsnCode: '9973', gstRate: '18%', description: 'Software Services / Licensing', confidence: 95, type: 'SERVICES' }]
};

// Main fetch function
export const fetchHSNDetails = async (query: string, productType: 'GOODS' | 'SERVICES'): Promise<HSNSuggestion[]> => {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  // 1. Cache Check
  const cached = getFromCache(cleanQuery);
  if (cached) return cached;

  // 2. Local Fallback (Exact/Partial Match)
  for (const [key, results] of Object.entries(FALLBACK_DATABASE)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      saveToCache(cleanQuery, results);
      return results;
    }
  }

  // 3. Database Search (Fuzzy)
  const dbResults = await searchInDatabase(cleanQuery, productType);
  if (dbResults.length > 0 && dbResults[0].confidence > 80) {
    saveToCache(cleanQuery, dbResults);
    return dbResults;
  }

  // 4. Gemini AI Search (Semantic)
  const aiResults = await fetchFromGemini(cleanQuery, productType);
  if (aiResults.length > 0) {
    saveToCache(cleanQuery, aiResults);
    return aiResults;
  }

  // Final fallback if everything fails
  return [{
    hsnCode: productType === 'GOODS' ? '9999' : '998399',
    gstRate: '18%',
    description: `${query} - Manual verification req.`,
    confidence: 30,
    type: productType
  }];
};

export const clearHSNCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};
