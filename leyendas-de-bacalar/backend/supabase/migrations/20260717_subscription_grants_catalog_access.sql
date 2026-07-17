-- Una suscripcion activa da acceso a TODO el catalogo 'subscription'/'mixed',
-- incluidas las leyendas publicadas DESPUES de suscribirse.
--
-- Problema: process_simulated_subscription reparte boletos (user_legend_access) solo de
-- las leyendas existentes al momento de suscribirse ("grant EXISTING subscription
-- legends"), asi que una leyenda de suscripcion publicada mas tarde quedaba bloqueada
-- para quien ya estaba suscrito: su suscripcion seguia activa pero nadie le creaba el
-- boleto, y user_has_active_legend_access solo miraba boletos.
--
-- El cambio es ADITIVO: se conservan las dos vias previas (leyenda gratis publicada, y
-- boleto explicito por codigo/compra/admin_grant/suscripcion) y se agrega una tercera
-- via basada en la suscripcion vigente. No revoca ningun acceso existente.
--
-- Aplicada en vivo el 2026-07-17 (migracion: subscription_grants_catalog_access).
CREATE OR REPLACE FUNCTION public.user_has_active_legend_access(p_user_id uuid, p_legend_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    -- 1) Leyenda gratis publicada: abierta a todos.
    exists (
      select 1
      from public.legends l
      where l.id = p_legend_id
        and l.status = 'published'
        and l.access_type = 'free'
    )
    -- 2) Boleto explicito: codigo, compra digital/fisica, admin_grant o suscripcion.
    or exists (
      select 1
      from public.user_legend_access ula
      where ula.user_id = p_user_id
        and ula.legend_id = p_legend_id
        and ula.status = 'active'
        and ula.starts_at <= now()
        and (
          ula.expires_at is null
          or ula.expires_at > now()
        )
    )
    -- 3) Suscripcion vigente => todo el catalogo de suscripcion/mixto.
    or exists (
      select 1
      from public.subscriptions s
      join public.legends l on l.id = p_legend_id
      where s.user_id = p_user_id
        and s.status = 'active'
        and s.starts_at <= now()
        and (
          s.ends_at is null
          or s.ends_at > now()
        )
        and l.status = 'published'
        and l.access_type in ('subscription', 'mixed')
    );
$function$;
