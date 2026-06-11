export const DOCUMENT_TO_PAGES_RESPONSE_SHAPE = {
  pages: [
    {
      page_number: 1,
      title: 'string en espanol',
      text_content: 'string en espanol',
      notes: ['string en espanol'],
    },
  ],
  warnings: ['string en espanol'],
  summary: 'string en espanol',
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
      'Always answer in Spanish.',
      'Use clear, natural, editorial Spanish for all visible content.',
      'If the source text is in another language, preserve proper names exactly and adapt the explanation to Spanish.',
      'The JSON keys must remain in English exactly as specified, but all visible values must be in Spanish.',
      'The fields title, text_content, notes, warnings, and summary must always be written in Spanish.',
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
      '- Respond always in Spanish, even if the source text is in another language.',
      '- Use clear, editorial, natural Spanish.',
      '- Keep proper names exactly as they appear in the source text.',
      '- Write warnings, summary, notes, titles, and text_content in Spanish.',
      '- Do not use English in any visible content values.',
      '- Keep JSON keys unchanged: pages, summary, warnings, notes, title, text_content, and page_number.',
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
