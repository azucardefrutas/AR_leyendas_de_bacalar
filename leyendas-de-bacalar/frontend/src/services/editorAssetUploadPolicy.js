function collectErrorMessages(error) {
  return [
    error?.message,
    error?.data?.error,
    error?.supabaseError?.message,
    error?.supabaseError?.data?.error,
  ].filter(Boolean).join(' ');
}

export function shouldFallbackEditorImageUpload(error) {
  const phase = error?.phase || error?.supabaseError?.phase || '';
  const message = collectErrorMessages(error);
  return phase === 'prepare'
    && /unsupported purpose\s+["']?editor_image["']?/i.test(message);
}
