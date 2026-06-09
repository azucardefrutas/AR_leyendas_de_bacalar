import { GoogleGenAI } from '@google/genai';

class GeminiProviderError extends Error {
  constructor(message, statusCode = 502, details = {}) {
    super(message);
    this.name = 'GeminiProviderError';
    this.statusCode = statusCode;
    this.details = details;
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

const parseJsonResponse = (value) => {
  const text = stripJsonFences(value);

  if (!text) {
    throw new GeminiProviderError('Gemini returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new GeminiProviderError('Gemini returned invalid JSON.', 502, {
      reason: error.message,
    });
  }
};

const assertStringArray = (value, fieldName) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new GeminiProviderError(`Gemini response field ${fieldName} must be an array of strings.`);
  }
};

const validatePage = (page, index) => {
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    throw new GeminiProviderError(`Gemini response page ${index + 1} is invalid.`);
  }

  const pageNumber = Number(page.page_number);
  const title = String(page.title ?? '').trim();
  const textContent = String(page.text_content ?? '').trim();

  if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
    throw new GeminiProviderError(`Gemini response page ${index + 1} has an invalid page_number.`);
  }

  if (!title) {
    throw new GeminiProviderError(`Gemini response page ${index + 1} has an empty title.`);
  }

  if (!textContent) {
    throw new GeminiProviderError(`Gemini response page ${index + 1} has empty text_content.`);
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
    throw new GeminiProviderError('Gemini response must be a JSON object.');
  }

  if (!Array.isArray(proposal.pages) || proposal.pages.length === 0) {
    throw new GeminiProviderError('Gemini response must include at least one page.');
  }

  assertStringArray(proposal.warnings, 'warnings');

  if (typeof proposal.summary !== 'string') {
    throw new GeminiProviderError('Gemini response field summary must be a string.');
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
      throw new GeminiProviderError('Gemini provider is not configured.', 503);
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
      throw new GeminiProviderError('Gemini request failed.', 502, {
        reason: error.message,
      });
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
