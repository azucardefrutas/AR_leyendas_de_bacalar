import { disabledProvider } from './disabledProvider.service.js';
import { geminiProvider } from './geminiProvider.service.js';
import { buildDocumentToPagesPrompt } from './prompts/documentToPages.prompt.js';

const getProviderName = () => {
  return String(process.env.AI_PROVIDER ?? 'disabled').trim().toLowerCase() || 'disabled';
};

const getProvider = () => {
  const providerName = getProviderName();

  if (providerName === 'disabled') {
    return disabledProvider;
  }

  if (providerName === 'gemini') {
    return geminiProvider;
  }

  return {
    name: 'disabled',
    proposePages: async () => ({
      ok: false,
      provider: 'disabled',
      reason: `AI provider "${providerName}" is not supported.`,
    }),
  };
};

export const proposeDocumentPagesWithAi = async ({ extractedText, sourceDocument, extractionId }) => {
  const provider = getProvider();
  const prompt = buildDocumentToPagesPrompt({ extractedText });

  const result = await provider.proposePages({
    prompt,
    extractedText,
    sourceDocument,
    extractionId,
  });

  return {
    ...result,
    provider: result.provider ?? provider.name,
  };
};
