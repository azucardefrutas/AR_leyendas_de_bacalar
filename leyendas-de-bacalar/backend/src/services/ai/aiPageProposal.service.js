import {
  getExtractionReadyForPages,
  getSourceDocumentAccessContext,
} from '../documentExtraction.service.js';
import { proposeDocumentPagesWithAi } from './aiProvider.service.js';

class AiPageProposalError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'AiPageProposalError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const prepareAiPageProposal = async ({ sourceDocumentId, requestedBy }) => {
  if (!sourceDocumentId) {
    throw new AiPageProposalError('Source document id is required.', 400);
  }

  if (!requestedBy?.userId || !Array.isArray(requestedBy.roles)) {
    throw new AiPageProposalError('Authenticated user context is required.', 401);
  }

  await getSourceDocumentAccessContext({
    sourceDocumentId,
    userId: requestedBy.userId,
    roles: requestedBy.roles,
  });

  const ready = await getExtractionReadyForPages(sourceDocumentId);
  let aiResult;

  try {
    aiResult = await proposeDocumentPagesWithAi({
      extractedText: ready.extractedText,
      sourceDocument: ready.sourceDocument,
      extractionId: ready.extractionId,
    });
  } catch (error) {
    const details = error.details && typeof error.details === 'object'
      ? error.details
      : {
          ok: false,
          provider: 'gemini',
          reason: 'ai_provider_error',
          status: error.statusCode || 500,
          message: error.message || 'AI provider request failed.',
          nextStep: 'inspect_backend_logs',
        };

    throw new AiPageProposalError(
      details.message || error.message || 'AI provider request failed.',
      details.status || error.statusCode || 500,
      {
        ...details,
        legendId: ready.legendId,
        sourceDocumentId,
        extractionId: ready.extractionId,
        textLength: ready.textLength,
      },
    );
  }

  if (!aiResult.ok) {
    return {
      ok: false,
      legendId: ready.legendId,
      sourceDocumentId,
      extractionId: ready.extractionId,
      textLength: ready.textLength,
      provider: aiResult.provider,
      reason: aiResult.reason,
      nextStep: aiResult.provider === 'disabled'
        ? 'ai_provider_disabled'
        : 'ai_provider_error',
    };
  }

  return {
    ok: true,
    legendId: ready.legendId,
    sourceDocumentId,
    extractionId: ready.extractionId,
    textLength: ready.textLength,
    provider: aiResult.provider,
    model: aiResult.model ?? null,
    proposal: {
      pages: aiResult.proposal.pages,
      summary: aiResult.proposal.summary,
      warnings: aiResult.proposal.warnings,
    },
    nextStep: 'review_ai_page_proposal',
  };
};
