import { GoogleGenAI } from '@google/genai';

class GeminiProviderError extends Error {
  constructor(message, statusCode = 502, details = {}) {
    super(message);
    this.name = 'GeminiProviderError';
    this.statusCode = statusCode;
    this.details = {
      ok: false,
      provider: 'gemini',
      status: statusCode,
      message,
      ...details,
    };
  }
}

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_TIMEOUT_MS = 60_000;

const responseSchema = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          page_number: { type: 'number' },
          title: { type: 'string' },
          text_content: { type: 'string' },
          notes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['page_number', 'title', 'text_content', 'notes'],
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
  },
  required: ['pages', 'warnings', 'summary'],
};

const getGeminiApiKey = () => String(process.env.GEMINI_API_KEY ?? '').trim();

const getGeminiModel = () => {
  return String(process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
};

const getResponseText = (response) => {
  if (typeof response?.text === 'function') {
    return response.text();
  }

  return response?.text;
};

const stripJsonFences = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
};

const getEmbeddedGeminiError = (message) => {
  const rawMessage = String(message ?? '');
  const firstBrace = rawMessage.indexOf('{');
  const lastBrace = rawMessage.lastIndexOf('}');

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(rawMessage.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
};

const sanitizeGeminiMessage = (message) => {
  return String(message || 'Gemini request failed.')
    .replace(/key=([^&\s]+)/gi, 'key=[redacted]')
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"',\s}]+/gi, 'api_key=[redacted]')
    .replace(/bearer\s+[a-z0-9._-]+/gi, 'bearer [redacted]');
};

const getGeminiRequestFailureDetails = (error) => {
  const embedded = getEmbeddedGeminiError(error?.message);
  const embeddedError = embedded?.error && typeof embedded.error === 'object' ? embedded.error : null;
  const rawStatus = Number(error?.status ?? error?.statusCode ?? embeddedError?.code);
  const status = Number.isInteger(rawStatus) ? rawStatus : 502;
  const code = String(error?.code || embeddedError?.status || (status === 503 ? 'UNAVAILABLE' : 'GEMINI_REQUEST_FAILED'));
  const message = sanitizeGeminiMessage(embeddedError?.message || error?.message);

  if (status === 400 || /INVALID_ARGUMENT|model|not found|not supported/i.test(`${code} ${message}`)) {
    return {
      reason: 'model_error',
      code,
      status,
      message,
      nextStep: 'check_gemini_model',
    };
  }

  if (status === 503 || code === 'UNAVAILABLE' || /unavailable|overloaded|high demand/i.test(message)) {
    return {
      reason: 'gemini_request_failed',
      code: code || 'UNAVAILABLE',
      status: 503,
      message,
      nextStep: 'try_again_later',
    };
  }

  return {
    reason: 'gemini_request_failed',
    code,
    status,
    message,
    nextStep: 'inspect_backend_logs',
  };
};

const parseJsonResponse = (value) => {
  const text = stripJsonFences(value);

  if (!text) {
    throw new GeminiProviderError('Gemini did not return valid JSON.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
    });
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new GeminiProviderError('Gemini did not return valid JSON.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
    });
  }
};

const assertStringArray = (value, fieldName) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: fieldName,
    });
  }
};

const validatePage = (page, index) => {
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      pageIndex: index,
    });
  }

  const pageNumber = Number(page.page_number);
  const title = String(page.title ?? '').trim();
  const textContent = String(page.text_content ?? '').trim();

  if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: 'page_number',
      pageIndex: index,
    });
  }

  if (!title) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: 'title',
      pageIndex: index,
    });
  }

  if (!textContent) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: 'text_content',
      pageIndex: index,
    });
  }

  assertStringArray(page.notes, `pages[${index}].notes`);

  return {
    page_number: pageNumber,
    title,
    text_content: textContent,
    notes: page.notes,
  };
};

const validateProposal = (proposal) => {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new GeminiProviderError('Gemini did not return valid JSON.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
    });
  }

  if (!Array.isArray(proposal.pages) || proposal.pages.length === 0) {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: 'pages',
    });
  }

  assertStringArray(proposal.warnings, 'warnings');

  if (typeof proposal.summary !== 'string') {
    throw new GeminiProviderError('Gemini did not return a valid page proposal.', 502, {
      reason: 'invalid_ai_response',
      code: 'INVALID_AI_RESPONSE',
      nextStep: 'try_again_or_adjust_prompt',
      field: 'summary',
    });
  }

  return {
    pages: proposal.pages.map(validatePage),
    warnings: proposal.warnings,
    summary: proposal.summary.trim(),
  };
};

export const geminiProvider = {
  name: 'gemini',

  proposePages: async ({ prompt }) => {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new GeminiProviderError('Gemini API key is not configured.', 503, {
        reason: 'missing_api_key',
        code: 'MISSING_API_KEY',
        nextStep: 'configure_gemini_api_key',
      });
    }

    const model = getGeminiModel();
    const ai = new GoogleGenAI({ apiKey });

    let response;

    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.2,
          httpOptions: {
            timeout: GEMINI_TIMEOUT_MS,
          },
        },
      });
    } catch (error) {
      const details = getGeminiRequestFailureDetails(error);
      throw new GeminiProviderError(details.message, details.status, details);
    }

    const parsed = parseJsonResponse(getResponseText(response));
    const proposal = validateProposal(parsed);

    return {
      ok: true,
      provider: 'gemini',
      model,
      proposal,
    };
  },
};
