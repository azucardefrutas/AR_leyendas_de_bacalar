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
      'Preserve the narrative tone of a cultural legend when the source text has one.',
      'Improve only organization, cleanup, and page separation.',
      'Return strict JSON only.',
      'Do not include markdown, code fences, or prose outside the JSON object.',
    ].join('\n'),
    user: [
      'Convert the extracted source text into a proposal of readable pages.',
      'Rules:',
      '- Do not rewrite the story into a different narrative.',
      '- Do not summarize unless the source text is explicitly repetitive.',
      '- Do not add events that are not present in the source text.',
      '- Remove obvious PDF extraction noise such as page counters, repeated headers, repeated footers, and fragments like "-- 10 of 13 --".',
      '- Keep page text faithful to the source.',
      '- Use short, neutral titles when useful.',
      '- Put any uncertainty in warnings or page notes.',
      '- If the source text is poor, incomplete, or too thin, say so in warnings.',
      '- If the source text appears to be an index, outline, draft, or non-legend document, say so in warnings.',
      '- Return valid JSON only, without markdown.',
      '',
      'Expected JSON shape:',
      JSON.stringify(DOCUMENT_TO_PAGES_RESPONSE_SHAPE, null, 2),
      '',
      'Source text:',
      text,
    ].join('\n'),
  };
};
