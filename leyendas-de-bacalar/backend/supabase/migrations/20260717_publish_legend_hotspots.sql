-- 20260717_publish_legend_hotspots.sql
-- Hueco corregido: al colocar un marcador sobre el documento (o una pagina), el hotspot
-- se crea en 'draft' (los creadores no pueden publicar hotspots directo). Al publicar la
-- leyenda, esos hotspots NO se publicaban -> el modelo no salia en el lector web publico
-- (loadHotspots solo trae published). Este trigger publica los hotspots draft/in_review de
-- una leyenda cuando la leyenda pasa a 'published', sin importar que codigo/RPC lo haga.
create or replace function public.publish_legend_hotspots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    update public.interactive_hotspots
      set status = 'published'
      where legend_id = new.id
        and status in ('draft', 'in_review');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_publish_legend_hotspots on public.legends;
create trigger trg_publish_legend_hotspots
  after update of status on public.legends
  for each row
  execute function public.publish_legend_hotspots();
