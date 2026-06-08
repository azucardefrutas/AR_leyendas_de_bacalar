export const disabledProvider = {
  name: 'disabled',
  proposePages: async () => ({
    ok: false,
    provider: 'disabled',
    reason: 'AI provider disabled',
  }),
};
