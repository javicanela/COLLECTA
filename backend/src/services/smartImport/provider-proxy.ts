const BYOK_PROVIDER_API_ENDPOINTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
};

function mapModelToEndpoint(provider: string, model?: string): string {
  const base = provider.toLowerCase();
  if (BYOK_PROVIDER_API_ENDPOINTS[base]) return BYOK_PROVIDER_API_ENDPOINTS[base];
  if (model) return `https://openrouter.ai/api/v1/chat/completions`;
  return BYOK_PROVIDER_API_ENDPOINTS.openrouter;
}

function buildSystemPrompt(): string {
  return `Eres un sistema de mapeo de datos contables. Recibiras filas de una hoja de calculo con datos de clientes y operaciones pendientes de pago.

Tu tarea es identificar a que campo canonico pertenece cada columna. Los campos canonicos son:
- client.rfc: RFC del cliente (formato mexicano)
- client.nombre: Nombre o razon social
- client.telefono: Telefono (10 digitos)
- client.email: Correo electronico
- client.regimen: Regimen fiscal
- client.categoria: Categoria o clasificacion
- client.asesor: Asesor asignado
- operation.tipo: Tipo de operacion (FISCAL, SEGURIDAD_SOCIAL, etc)
- operation.descripcion: Descripcion detallada
- operation.monto: Monto o adeudo (numero)
- operation.fechaVence: Fecha de vencimiento
- operation.fechaPago: Fecha de pago
- operation.estatus: Estado (PENDIENTE, PAGADO, etc)
- operation.asesor: Asesor de la operacion
- operation.excluir: Booleano si debe excluirse
- operation.archived: Booleano si esta archivado
- ignore: Columna que no corresponde a ningun campo

Responde SOLO con un JSON valido con dos campos:
1. "mappings": array de objetos con { "columnIndex": number, "field": string, "confidence": number (0-1) }
2. "reasoning": string breve explicando tus decisiones`;
}

function buildUserPrompt(sheets: Array<{ name: string; rows: unknown[][] }>): string {
  return `Analiza las siguientes hojas de datos contables y determina el mapeo de columnas:

${JSON.stringify(sheets, null, 2)}

Para cada columna, determina el campo canonico mas probable. Considera tanto el encabezado como los valores de ejemplo.`;
}

interface ProviderResult {
  mappings: Array<{ columnIndex: number; field: string; confidence: number }>;
}

export async function analyzeWithByokProvider(
  sheets: Array<{ name: string; rows: unknown[][] }>,
  config: { provider: string; apiKey: string; model?: string },
): Promise<ProviderResult> {
  const url = mapModelToEndpoint(config.provider, config.model);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.provider.toLowerCase() === 'openrouter') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['HTTP-Referer'] = 'https://collecta.app';
  } else if (config.provider.toLowerCase() === 'groq') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else if (config.provider.toLowerCase() === 'gemini') {
    headers['x-goog-api-key'] = config.apiKey;
  }

  const body = {
    model: config.model || 'google/gemini-2.0-flash-001',
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(sheets) },
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    throw new Error(`Provider API error ${response.status}: ${errorText.substring(0, 500)}`);
  }

  const data = await response.json() as any;

  let content = '';
  if (data.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    content = data.candidates[0].content.parts[0].text;
  }

  if (!content) throw new Error('No content in provider response');

  const parsed = JSON.parse(content.replace(/```json?/g, '').replace(/```/g, '').trim());
  return {
    mappings: parsed.mappings || [],
  };
}
