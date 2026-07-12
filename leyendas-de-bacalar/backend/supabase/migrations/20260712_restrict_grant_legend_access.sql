-- user_legend_access must only be granted through trusted server-side flows.
-- Public-facing RPCs (purchase, subscription, and code redemption) call this
-- helper internally as SECURITY DEFINER functions.
revoke all on function public.grant_legend_access(
  uuid,
  uuid,
  public.user_access_source,
  uuid,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.grant_legend_access(
  uuid,
  uuid,
  public.user_access_source,
  uuid,
  timestamptz
) to service_role;
