import { disabledProvider } from './disabledProvider.service.js';
import { buildDocumentToPagesPrompt } from './prompts/documentToPages.prompt.js';

const getProviderName = () => {
  return String(process.env.AI_PROVIDER ?? 'disabled').trim().toLowerCase() || 'disabled';
};

const getProvider = () => {
  const providerName = getProviderName();

  if (providerName === 'disabled') {
    return disabledProvider;
  }

  return {
    name: providerName,
    proposePages: async () => ({
      ok: false,
      provider: providerName,
      reason: 'AI provider not implemented',
    }),
  };
};

export const proposeDocumentPagesWithAi = async ({ extractedText }) => {
  const provider = getProvider();
  const prompt = buildDocumentToPagesPrompt({ extractedText });

  const result = await provider.proposePages({
    prompt,
    extractedText,
  });

  return {
    ...result,
    provider: result.provider ?? provider.name,
  };
};
