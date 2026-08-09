-- Leyendas de Bacalar
-- 09 - Safe reference data
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 11. DATOS BASE SEGUROS
-- Only reference/configuration data is seeded here. No users or demo legends.

insert into public.roles (id, name, description)
values
  ('2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', 'reader', 'Usuario lector que puede explorar, leer y desbloquear leyendas.'),
  ('9047098d-c95c-4e09-a47f-85761c625628', 'creator', 'Usuario creador que puede crear leyendas, subir recursos y enviar contenido a revisión.'),
  ('56d83902-7c5b-4287-b97c-9615af722c9f', 'admin', 'Administrador que puede revisar contenido, gestionar códigos y administrar usuarios.'),
  ('e0458ea4-a3e5-4e24-8d22-40dc6379eae1', 'super_admin', 'Administrador principal con permisos para gestionar otros administradores.')
on conflict (name) do update
set description = excluded.description;

insert into public.genres (id, name, description)
values
  ('ec4a523e-8204-47a0-87a8-80da11d0b415', 'Terror', 'Historias con elementos de miedo, suspenso o apariciones.'),
  ('70313fa0-12f2-4940-bb6b-8a2e7eb3a0fa', 'Misterio', 'Historias centradas en secretos, enigmas o sucesos inexplicables.'),
  ('d3b13ffb-0bfb-4a5d-b3ec-560b81069987', 'Cultura', 'Contenido relacionado con identidad, tradición y memoria cultural.'),
  ('85ed6543-2e72-4e51-bb68-b71609af716f', 'Aventura', 'Historias con exploración, viaje o descubrimiento.'),
  ('8ab63297-8ee2-4e1c-9edf-8a4e6d890262', 'Fantasía', 'Historias con elementos mágicos o sobrenaturales.'),
  ('e97406b3-4c5b-40b7-a4f2-39ff484e0945', 'Leyenda local', 'Relatos tradicionales o inspirados en la región.'),
  ('bac29a3b-906e-4a20-aabc-ced24f31f21d', 'Histórico', 'Relatos inspirados en sucesos, lugares o personajes históricos.'),
  ('0acdb07b-c363-4d6f-a60f-0313b41489c1', 'Sobrenatural', 'Historias con apariciones, entidades, espíritus o sucesos inexplicables.'),
  ('521101f9-b4ca-444f-9c8e-cca1122a50a8', 'Infantil', 'Contenido pensado para público infantil o familiar.'),
  ('26b647e9-8f32-4713-88db-c7d707670e09', 'Educativo', 'Contenido con enfoque de aprendizaje, cultura o divulgación.')
on conflict (name) do update
set description = excluded.description;

insert into public.cover_templates (id, name, scope, owner_id, config, is_active)
values
  ('4678c2e3-03e6-46d9-b5cf-4e618539b94a', 'Clásica', 'system', null, '{"font":"serif","align":"center","preset":"classic","palette":["#1e3a5f","#f5efe0"]}', true),
  ('cc2db1ce-f36e-4637-9001-bca59a2b72ed', 'Moderna', 'system', null, '{"font":"sans","align":"left","preset":"modern","palette":["#0f766e","#ecfeff"]}', true),
  ('844c1a6c-c51c-4177-85d4-75ab3a57b6b6', 'Minimal', 'system', null, '{"font":"sans","align":"center","preset":"minimal","palette":["#111827","#ffffff"]}', true),
  ('0dff8a19-b062-4c3e-af5b-2dd01868a417', 'En blanco', 'system', null, '{"font":"sans","align":"center","preset":"blank","palette":["#ffffff","#111827"]}', true)
on conflict (id) do update
set
  name = excluded.name,
  scope = excluded.scope,
  config = excluded.config,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.system_settings (key, value, is_public)
values
  ('maintenance', '{"enabled":false,"message":""}', true),
  ('announcement', '{"type":"info","enabled":false,"message":""}', true),
  ('creator_registration', '{"open":true}', true),
  ('upload_limit_mb', '{"value":50}', false)
on conflict (key) do update
set
  value = excluded.value,
  is_public = excluded.is_public,
  updated_at = now();

commit;
