import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hindi/English Synonym Map for Keyword Generation
const HINDI_SYNONYMS = {
    'milk': ['doodh', 'dairy', 'fresh milk'],
    'wheat': ['gehun', 'gehu', 'grain', 'atta', 'aata'],
    'flour': ['atta', 'aata', 'maida', 'besan', 'fine flour'],
    'rice': ['chawal', 'basmati', 'paddy', 'dhaan'],
    'sugar': ['cheeni', 'shakkar', 'chini', 'misri'],
    'meat': ['maans', 'gosht', 'chicken', 'mutton', 'beef', 'pork'],
    'potato': ['aloo', 'batata'],
    'tomato': ['tamatar'],
    'onion': ['pyaz', 'kanda'],
    'salt': ['namak'],
    'cement': ['siment', 'amrit', 'concrete'],
    'mobile': ['phone', 'cellphone', 'smartphone'],
    'water': ['paani', 'aqua'],
    'oil': ['tel', 'taila', 'cooking oil'],
    'fish': ['machli', 'macchli'],
    'egg': ['anda', 'ande'],
    'honey': ['shahad'],
    'tea': ['chai', 'chaay'],
    'coffee': ['kafi'],
    'spice': ['masala', 'mirch', 'haldi', 'jeera', 'chilli'],
    'clothes': ['kapda', 'kapde', 'vastra', 'garment'],
    'shoes': ['joota', 'jutey', 'footwear'],
    'car': ['gaadi', 'gaddi', 'automobile'],
    'cycle': ['saikal', 'bicycle']
};

function cleanText(text) {
    return text
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractHSNCodes(html) {
    const text = cleanText(html);
    if (!text || text === '[Omitted]') return [];

    return text.split(/,|\s+/)
        .map(code => code.replace(/[^0-9]/g, ''))
        .filter(code => code.length >= 2);
}

function generateKeywords(hsnCode, description) {
    const keywords = new Set();
    if (hsnCode) {
        keywords.add(hsnCode.substring(0, 2));
        keywords.add(hsnCode.substring(0, 4));
        keywords.add(hsnCode);
    }
    const words = description.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length > 2);
    words.forEach(word => {
        keywords.add(word);
        if (HINDI_SYNONYMS[word]) {
            HINDI_SYNONYMS[word].forEach(syn => keywords.add(syn));
        }
    });
    if (description.toLowerCase().includes('flour') || description.toLowerCase().includes('wheat')) {
        keywords.add('atta');
        keywords.add('aata');
        keywords.add('flour');
    }
    return Array.from(keywords).slice(0, 20);
}

function parseHTML() {
    const htmlPath = path.join(__dirname, '..', 'pdf', 'hsn.html');
    console.log(`📖 Reading ${htmlPath}...`);
    const content = fs.readFileSync(htmlPath, 'utf-8');

    const records = [];
    const rows = content.split(/<tr[^>]*>/i);

    console.log(`🔍 Found ${rows.length} rows. Parsing...`);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.split(/<td[^>]*>/i);

        if (cells.length < 8) continue;

        const hsnHtml = cells[3].split('</td>')[0];
        const descHtml = cells[4].split('</td>')[0];
        const igstRateHtml = cells[7].split('</td>')[0];

        const hsnCodes = extractHSNCodes(hsnHtml);
        const description = cleanText(descHtml);
        const igstRate = cleanText(igstRateHtml).replace('%', '').trim() || '18';

        if (hsnCodes.length === 0 || description === '[Omitted]' || !description) continue;

        hsnCodes.forEach(code => {
            records.push({
                hsn_code: code,
                description: description,
                gst_rate: igstRate + '%',
                keywords: generateKeywords(code, description)
            });
        });
    }

    console.log(`✅ Parsed ${records.length} records.`);
    return records;
}

async function migrate(records) {
    console.log(`🚀 Migrating ${records.length} records to Supabase...`);

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase.from('hsn_codes').insert(batch);

        if (error) {
            console.error(`❌ Error in batch ${i / batchSize}:`, error.message);
        } else {
            process.stdout.write(`\r✅ Progress: ${i + batch.length}/${records.length}`);
        }
    }
    console.log('\n✨ Migration complete!');
}

async function main() {
    try {
        const records = parseHTML();
        if (records.length === 0) return;

        const sqlPath = path.join(__dirname, '..', 'pdf', 'hsn_from_html.sql');
        console.log(`📝 Generating SQL file ${sqlPath}...`);

        let sqlContent = "INSERT INTO hsn_codes (hsn_code, description, gst_rate, keywords) VALUES\n";
        const sqlValues = records.slice(0, 1000).map(r =>
            `('${r.hsn_code}', '${r.description.replace(/'/g, "''")}', '${r.gst_rate}', ARRAY[${r.keywords.map(k => `'${k.replace(/'/g, "''")}'`).join(',')}]::text[])`
        );
        sqlContent += sqlValues.join(',\n') + ";";
        fs.writeFileSync(sqlPath, sqlContent);

        console.log('⏳ Waiting 2 seconds before migration...');
        await new Promise(r => setTimeout(r, 2000));

        await migrate(records);
    } catch (err) {
        console.error('💥 Fatal error:', err);
    }
}

main();
