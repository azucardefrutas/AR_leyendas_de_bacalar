export const DOCUMENT_TO_PAGES_RESPONSE_SHAPE = {
  pages: [
    {
      page_number: 1,
      title: 'string',
      text_content: 'string',
      notes: [],
    },
  ],
  warnings: [],
  summary: 'string',
};

export const buildDocumentToPagesPrompt = ({ extractedText }) => {
  const text = String(extractedText ?? '').trim();

  return {
    system: [
      'You help structure cultural legend source text into readable pages.',
      'Do not invent facts, characters, places, dates, events, or cultural details.',
      'Preserve proper names and the cultural meaning of the original text.',
      'Improve only organization, cleanup, and page separation.',
      'Return strict JSON only.',
    ].join('\n'),
    user: [
      'Convert the extracted source text into a proposal of readable pages.',
      'Rules:',
      '- Do not rewrite the story into a different narrative.',
      '- Do not summarize unless the source text is explicitly repetitive.',
      '- Do not add events that are not present in the source text.',
      '- Keep page text faithful to the source.',
      '- Use short, neutral titles when useful.',
      '- Put any uncertainty in warnings or page notes.',
      '',
      'Expected JSON shape:',
      JSON.stringify(DOCUMENT_TO_PAGES_RESPONSE_SHAPE, null, 2),
      '',
      'Source text:',
      text,
    ].join('\n'),
  };
};
