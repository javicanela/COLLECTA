import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// Load SINONIMOS from the data folder
const SINONIMOS_PATH = path.join(__dirname, '..', '..', '..', 'data', 'SINONIMOS_COLUMNAS.json');
let SINONIMOS: Record<string, { alias_exactos: string[]; alias_parciales: string[] }> = {};
try {
  SINONIMOS = JSON.parse(fs.readFileSync(SINONIMOS_PATH, 'utf-8'));
} catch {
  logger.warn('SINONIMOS_COLUMNAS.json not found, using empty synonyms');
}

interface AiResult {
  mapping: Record<string, string>;
  confianza: Record<string, string>;
  notas: string;
  _source: string;
}

/** Read an API key from Config table first; fallback to process.env */
async function getApiKey(configKey: string, envKey: string): Promise<string | null> {
  try {
    const row = await prisma.config.findUnique({ where: { key: configKey } });
    if (row?.value && row.value.trim().length > 0) return row.value.trim();
  } catch {
    // silently ignore DB errors — fallback to env
  }
  return process.env[envKey] || null;
}

/** Save last provider used to Config table */
async function saveLastProvider(provider: string): Promise<void> {
  try {
    await prisma.config.upsert({
      where: { key: 'ai_last_provider' },
      update: { value: provider },
      create: { key: 'ai_last_provider', value: provider },
    });
  } catch {
    // non-critical
  }
}

function parseSafeJSON(txt: string): any | null {
  try {
    return JSON.parse(txt.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

async function tryGemini(prompt: string): Promise<AiResult | null> {
  const key = await getApiKey('gemini_api_key', 'GEMINI_API_KEY');
  if (!key) return null;

  try {
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } },
      { timeout: 15000 }
    );
    const txt = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseSafeJSON(txt);
    return parsed?.mapping ? { ...parsed, _source: 'gemini' } : null;
  } catch (err: any) {
    logger.warn({ provider: 'gemini', error: err.message }, 'Gemini provider failed');
    return null;
  }
}

async function tryGroq(prompt: string): Promise<AiResult | null> {
  const key = await getApiKey('groq_api_key', 'GROQ_API_KEY');
  if (!key) return null;

  try {
    const r = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.1 },
      { headers: { 'Authorization': `Bearer ${key}` }, timeout: 15000 }
    );
    const txt = r.data?.choices?.[0]?.message?.content || '';
    const parsed = parseSafeJSON(txt);
    return parsed?.mapping ? { ...parsed, _source: 'groq' } : null;
  } catch (err: any) {
    logger.warn({ provider: 'groq', error: err.message }, 'Groq provider failed');
    return null;
  }
}

async function tryOpenRouter(prompt: string): Promise<AiResult | null> {
  const key = await getApiKey('openrouter_api_key', 'OPENROUTER_API_KEY');
  if (!key) return null;

  try {
    const r = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'mistralai/mistral-7b-instruct', messages: [{ role: 'user', content: prompt }], temperature: 0.1 },
      { headers: { 'Authorization': `Bearer ${key}` }, timeout: 15000 }
    );
    const txt = r.data?.choices?.[0]?.message?.content || '';
    const parsed = parseSafeJSON(txt);
    return parsed?.mapping ? { ...parsed, _source: 'openrouter' } : null;
  } catch (err: any) {
    logger.warn({ provider: 'openrouter', error: err.message }, 'OpenRouter provider failed');
    return null;
  }
}

export function regexFallback(headers: string[], dataRows: string[][]): AiResult {
  const mapping: Record<string, string> = {};
  const confianza: Record<string, string> = {};

  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  for (const [field, synonyms] of Object.entries(SINONIMOS)) {
    const exactAliases = (synonyms.alias_exactos || []).map((a: string) =>
      a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    const partialAliases = (synonyms.alias_parciales || []).map((a: string) =>
      a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    // Try exact match first
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (exactAliases.includes(normalizedHeaders[i])) {
        mapping[i.toString()] = field;
        confianza[i.toString()] = 'high';
        break;
      }
    }

    // Try partial match
    if (!Object.values(mapping).includes(field)) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (mapping[i.toString()]) continue;
        for (const partial of partialAliases) {
          if (normalizedHeaders[i].includes(partial) || partial.includes(normalizedHeaders[i])) {
            mapping[i.toString()] = field;
            confianza[i.toString()] = 'medium';
            break;
          }
        }
      }
    }
  }

  // Pattern-based detection from data
  if (dataRows.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      if (mapping[i.toString()]) continue;
      const sampleValues = dataRows.slice(0, 5).map(r => r[i] || '');

      // RFC pattern
      if (sampleValues.some(v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(v.trim()))) {
        mapping[i.toString()] = 'rfc';
        confianza[i.toString()] = 'high';
      }
      // Email
      else if (sampleValues.some(v => /@/.test(v))) {
        mapping[i.toString()] = 'email';
        confianza[i.toString()] = 'high';
      }
      // Phone (10 digits)
      else if (sampleValues.some(v => /^\d{10}$/.test(v.replace(/\D/g, '')))) {
        mapping[i.toString()] = 'telefono';
        confianza[i.toString()] = 'medium';
      }
      // Money amount
      else if (sampleValues.some(v => /^\$?[\d,]+\.?\d*$/.test(v.trim()))) {
        mapping[i.toString()] = 'monto';
        confianza[i.toString()] = 'medium';
      }
      // Date
      else if (sampleValues.some(v => /\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/.test(v))) {
        mapping[i.toString()] = 'fechaVence';
        confianza[i.toString()] = 'medium';
      }
    }
  }

  return {
    mapping,
    confianza,
    notas: 'Deteccion automatica por regex (sin IA). Verifica las columnas antes de confirmar.',
    _source: 'regex',
  };
}

export async function aiCascade(headers: string[], rows: string[][], provider: string = 'auto'): Promise<AiResult> {
  const prompt = `Analiza estas columnas de un archivo de datos fiscales mexicano y mapea cada indice de columna al campo correspondiente.
Columnas: ${JSON.stringify(headers)}
Primeras filas de datos: ${JSON.stringify(rows.slice(0, 5))}

Campos posibles: rfc, nombre, telefono, email, monto, fechaVence, tipo, descripcion, asesor, regimen, categoria

Responde SOLO con JSON asi:
{"mapping": {"0": "campo", "1": "campo"}, "confianza": {"0": "high", "1": "medium"}, "notas": "explicacion breve"}`;

  let result: AiResult | null = null;

  if (provider === 'gemini') result = await tryGemini(prompt);
  else if (provider === 'groq') result = await tryGroq(prompt);
  else if (provider === 'openrouter') result = await tryOpenRouter(prompt);
  else if (provider !== 'regex') {
    // Auto cascade
    result = await tryGemini(prompt);
    if (!result) result = await tryGroq(prompt);
    if (!result) result = await tryOpenRouter(prompt);
  }

  // Tier 4 — Regex fallback — ALWAYS works
  if (!result) {
    logger.info('All AI providers failed, falling back to regex');
    result = regexFallback(headers, rows);
  }

  // Persist which provider was used
  await saveLastProvider(result._source);

  return result;
}

/** Test a single provider with minimal sample data. Returns success/error details. */
export async function testProvider(provider: 'gemini' | 'groq' | 'openrouter'): Promise<{ success: boolean; provider: string; message: string; hasKey: boolean }> {
  const keyMap: Record<string, { configKey: string; envKey: string }> = {
    gemini: { configKey: 'gemini_api_key', envKey: 'GEMINI_API_KEY' },
    groq: { configKey: 'groq_api_key', envKey: 'GROQ_API_KEY' },
    openrouter: { configKey: 'openrouter_api_key', envKey: 'OPENROUTER_API_KEY' },
  };

  const { configKey, envKey } = keyMap[provider];
  const key = await getApiKey(configKey, envKey);

  if (!key) {
    return { success: false, provider, message: 'Sin API key configurada', hasKey: false };
  }

  const prompt = `Responde solo con: {"mapping":{"0":"rfc"},"confianza":{"0":"high"},"notas":"test ok"}`;

  try {
    let result: AiResult | null = null;
    if (provider === 'gemini') result = await tryGemini(prompt);
    else if (provider === 'groq') result = await tryGroq(prompt);
    else if (provider === 'openrouter') result = await tryOpenRouter(prompt);

    if (result) {
      return { success: true, provider, message: `Conexion exitosa`, hasKey: true };
    } else {
      return { success: false, provider, message: 'La API respondio pero el formato es invalido', hasKey: true };
    }
  } catch (err: any) {
    return { success: false, provider, message: err.message || 'Error de conexion', hasKey: true };
  }
}
