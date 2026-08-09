-- RECUPERACIÓN HISTÓRICA DESPUÉS DE AUTH
-- Do not run this file until the old Auth users have been restored with the
-- same UUIDs. The preflight below aborts before writing if any user is missing.
-- Storage URLs still point to wkkzgyhyarqwxoqcdaul; migrate objects before rewriting them.

begin;

do $$
declare
  missing_user_ids uuid[];
begin
  select array_agg(expected.id order by expected.id)
  into missing_user_ids
  from (
    values
      ('9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2'::uuid),
      ('18c428e0-ada7-4aa6-8993-1a33be7be6fd'::uuid),
      ('1dab12f6-df97-4305-9d87-bb2618b93ae0'::uuid),
      ('aadf4552-ba98-4d57-b304-12b403f09c29'::uuid),
      ('328ce2de-a0d3-4fa8-874b-ca595aaabadf'::uuid),
      ('9dc065c8-888c-4342-9ce2-af8a7c81b381'::uuid),
      ('4325bf1e-cbfc-4bb0-9d66-095dc0653171'::uuid),
      ('ee09573f-6499-43f6-8fc6-8fa1092761fe'::uuid),
      ('2f412137-0da6-4865-bf6d-dc121c54beb5'::uuid),
      ('ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d'::uuid)
  ) as expected(id)
  left join auth.users actual on actual.id = expected.id
  where actual.id is null;

  if missing_user_ids is not null then
    raise exception 'Historical import blocked. Missing auth.users UUIDs: %', missing_user_ids;
  end if;
end
$$;

-- ========== roles ==========
INSERT INTO public.roles (id, name, description, created_at) VALUES ('2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', 'reader', 'Usuario lector que puede explorar, leer y desbloquear leyendas.', '2026-05-24 21:12:08.331877+00'),
('9047098d-c95c-4e09-a47f-85761c625628', 'creator', 'Usuario creador que puede crear leyendas, subir recursos y enviar contenido a revisión.', '2026-05-24 21:12:08.331877+00'),
('56d83902-7c5b-4287-b97c-9615af722c9f', 'admin', 'Administrador que puede revisar contenido, gestionar códigos y administrar usuarios.', '2026-05-24 21:12:08.331877+00'),
('e0458ea4-a3e5-4e24-8d22-40dc6379eae1', 'super_admin', 'Administrador principal con permisos para gestionar otros administradores.', '2026-05-24 21:12:08.331877+00')
on conflict do nothing;

-- ========== genres ==========
INSERT INTO public.genres (id, name, description, created_at) VALUES ('ec4a523e-8204-47a0-87a8-80da11d0b415', 'Terror', 'Historias con elementos de miedo, suspenso o apariciones.', '2026-05-24 21:15:10.616124+00'),
('70313fa0-12f2-4940-bb6b-8a2e7eb3a0fa', 'Misterio', 'Historias centradas en secretos, enigmas o sucesos inexplicables.', '2026-05-24 21:15:10.616124+00'),
('d3b13ffb-0bfb-4a5d-b3ec-560b81069987', 'Cultura', 'Contenido relacionado con identidad, tradición y memoria cultural.', '2026-05-24 21:15:10.616124+00'),
('85ed6543-2e72-4e51-bb68-b71609af716f', 'Aventura', 'Historias con exploración, viaje o descubrimiento.', '2026-05-24 21:15:10.616124+00'),
('8ab63297-8ee2-4e1c-9edf-8a4e6d890262', 'Fantasía', 'Historias con elementos mágicos o sobrenaturales.', '2026-05-24 21:15:10.616124+00'),
('e97406b3-4c5b-40b7-a4f2-39ff484e0945', 'Leyenda local', 'Relatos tradicionales o inspirados en la región.', '2026-05-24 21:15:10.616124+00'),
('bac29a3b-906e-4a20-aabc-ced24f31f21d', 'Histórico', 'Relatos inspirados en sucesos, lugares o personajes históricos.', '2026-05-24 22:52:52.714303+00'),
('0acdb07b-c363-4d6f-a60f-0313b41489c1', 'Sobrenatural', 'Historias con apariciones, entidades, espíritus o sucesos inexplicables.', '2026-05-24 22:52:52.714303+00'),
('521101f9-b4ca-444f-9c8e-cca1122a50a8', 'Infantil', 'Contenido pensado para público infantil o familiar.', '2026-05-24 22:52:52.714303+00'),
('26b647e9-8f32-4713-88db-c7d707670e09', 'Educativo', 'Contenido con enfoque de aprendizaje, cultura o divulgación.', '2026-05-24 22:52:52.714303+00'),
('5ccec8c6-ea5d-4063-bd9f-2a992a6c6419', 'Gf', NULL, '2026-07-14 03:10:19.9852+00'),
('1d0dab0f-dcf6-4a9e-be40-09cf98e832a0', 'Ii', NULL, '2026-07-14 03:10:19.9852+00'),
('742f17f6-e415-47b2-b636-1ec87fe42825', 'Ilio', NULL, '2026-07-14 03:10:19.9852+00')
on conflict do nothing;

-- ========== users_profile ==========
INSERT INTO public.users_profile (id, full_name, username, avatar_url, bio, status, active_role, created_at, updated_at, cover_url) VALUES ('9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', 'autor.demo@leyendas.com', 'user_9ac6c729', NULL, NULL, 'active', 'creator', '2026-05-24 23:34:55.683253+00', '2026-05-24 23:48:32.759697+00', NULL),
('18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'Administrador Leyendas', 'admin_leyendas', NULL, NULL, 'active', 'admin', '2026-05-27 00:33:49.559245+00', '2026-05-27 00:52:17.753519+00', NULL),
('1dab12f6-df97-4305-9d87-bb2618b93ae0', 'Crimildo Alexander Tuyub Antonio', 'user_1dab12f6', NULL, NULL, 'active', 'creator', '2026-05-27 04:32:50.875765+00', '2026-05-27 05:04:49.627539+00', NULL),
('aadf4552-ba98-4d57-b304-12b403f09c29', 'fabian', 'user_aadf4552', NULL, NULL, 'active', 'reader', '2026-05-28 17:14:57.856646+00', '2026-05-28 17:14:57.856646+00', NULL),
('328ce2de-a0d3-4fa8-874b-ca595aaabadf', 'JUAN ulises', 'user_328ce2de', NULL, NULL, 'active', 'reader', '2026-05-30 03:07:00.425023+00', '2026-05-30 03:07:00.425023+00', NULL),
('9dc065c8-888c-4342-9ce2-af8a7c81b381', 'tonyhuh2345@gmail.com', 'user_9dc065c8', NULL, NULL, 'active', 'reader', '2026-05-30 06:21:45.431695+00', '2026-05-30 06:21:45.431695+00', NULL),
('4325bf1e-cbfc-4bb0-9d66-095dc0653171', 'audomarobalam9@gmail.com', 'user_4325bf1e', NULL, NULL, 'active', 'reader', '2026-05-31 14:43:45.056127+00', '2026-06-04 16:50:28.687355+00', NULL),
('ee09573f-6499-43f6-8fc6-8fa1092761fe', '2024072830@upb.edu.mx', 'user_ee09573f', NULL, NULL, 'active', 'reader', '2026-06-10 16:07:10.04859+00', '2026-06-10 16:07:10.04859+00', NULL),
('2f412137-0da6-4865-bf6d-dc121c54beb5', 'Gx gallery ', 'bacachitoo', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/profiles/avatar/1783301673074-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', 'Animo la vida sigue ', 'active', 'creator', '2026-05-26 04:01:27.686063+00', '2026-07-06 01:48:57.18808+00', NULL),
('ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'tony', 'tony', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d/profiles/avatar/1783573507381-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', NULL, 'active', 'reader', '2026-07-08 04:59:30.748362+00', '2026-07-09 05:05:18.793251+00', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d/profiles/cover/1783573513727-whatsapp-image-2026-07-05-at-9-13-12-am-1.jpeg')
on conflict (id) do update set
  full_name = excluded.full_name,
  username = excluded.username,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  status = excluded.status,
  active_role = excluded.active_role,
  updated_at = excluded.updated_at,
  cover_url = excluded.cover_url;

-- ========== user_roles ==========
INSERT INTO public.user_roles (user_id, role_id, assigned_by, created_at) VALUES ('9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-24 23:34:55.683253+00'),
('9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', '9047098d-c95c-4e09-a47f-85761c625628', NULL, '2026-05-24 23:48:32.759697+00'),
('2f412137-0da6-4865-bf6d-dc121c54beb5', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-26 04:01:27.686063+00'),
('2f412137-0da6-4865-bf6d-dc121c54beb5', '9047098d-c95c-4e09-a47f-85761c625628', NULL, '2026-05-26 05:31:42.901837+00'),
('18c428e0-ada7-4aa6-8993-1a33be7be6fd', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-27 00:33:49.559245+00'),
('18c428e0-ada7-4aa6-8993-1a33be7be6fd', '56d83902-7c5b-4287-b97c-9615af722c9f', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', '2026-05-27 00:50:57.55225+00'),
('1dab12f6-df97-4305-9d87-bb2618b93ae0', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-27 04:32:50.875765+00'),
('1dab12f6-df97-4305-9d87-bb2618b93ae0', '9047098d-c95c-4e09-a47f-85761c625628', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', '2026-05-27 05:04:49.627539+00'),
('aadf4552-ba98-4d57-b304-12b403f09c29', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-28 17:14:57.856646+00'),
('328ce2de-a0d3-4fa8-874b-ca595aaabadf', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-30 03:07:00.425023+00'),
('9dc065c8-888c-4342-9ce2-af8a7c81b381', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-30 06:21:45.431695+00'),
('4325bf1e-cbfc-4bb0-9d66-095dc0653171', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-05-31 14:43:45.056127+00'),
('ee09573f-6499-43f6-8fc6-8fa1092761fe', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-06-10 16:07:10.04859+00'),
('ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '2ae0b9b1-d7f8-4761-9c94-fab887b5bf36', NULL, '2026-07-08 04:59:30.748362+00')
on conflict do nothing;

-- ========== creator_applications ==========
INSERT INTO public.creator_applications (id, user_id, status, reason, portfolio_url, reviewed_by, reviewed_at, admin_feedback, created_at, pen_name, legal_first_name, legal_last_name, affiliation, city, state_region, country, phone, biography, creator_terms_accepted_at, creator_privacy_accepted_at, authorship_declaration_accepted_at, terms_version, privacy_version, email_confirmed_at_snapshot, onboarding_completed_at) VALUES ('0ed21f16-ac24-482a-b9c3-8dcbe21485b2', '9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', 'approved', 'Soy parte del equipo de animación y quiero subir leyendas, modelos 3D y marcadores AR.', NULL, NULL, '2026-05-24 23:48:32.759697+00', 'Aprobado para pruebas del proyecto.', '2026-05-24 23:45:14.472488+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('eceed4fa-f143-43c0-a53d-988a001ac0e9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'approved', 'porque si', NULL, NULL, '2026-05-26 05:31:42.901837+00', 'Solicitud aprobada para crear contenido cultural.', '2026-05-26 05:29:34.42353+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('5bd3fdbb-69e8-457a-8d11-5961528e160d', '1dab12f6-df97-4305-9d87-bb2618b93ae0', 'approved', 'Asunto: Solicitud para ser Creador de Historias

Hola,

Mi nombre es Crimildo Alexander Tuyub Antonio. Les escribo para solicitar formalmente el acceso como Creador de Historias en su plataforma. Tengo mucha creatividad, pasión por la escritura y contenido original que me encantaría compartir con su comunidad.

Agradezco de antemano la oportunidad y quedo atento a su respuesta.', NULL, '18c428e0-ada7-4aa6-8993-1a33be7be6fd', '2026-05-27 05:04:49.627539+00', 'Solicitud aprobada para crear contenido cultural en Leyendas de Bacalar.', '2026-05-27 04:34:20.820796+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('4d45261c-f57d-4a59-9154-1353c033ad57', '328ce2de-a0d3-4fa8-874b-ca595aaabadf', 'pending', 'vfevefvevevgregegevefvevevevefvevvfevefvevevevevefvefvefv', NULL, NULL, NULL, 'Pendiente de confirmacion de alta como creador por correo.', '2026-06-02 03:59:26.165056+00', 'tony', 'JUAN', 'PUC', 'universidad politecnica de bacalar', 'chetumal', 'quintana roo', 'Mexico', '9988515380', 'jiiihwofhofqwbfuorevboefbvuvbefvuebfvefbvefv', '2026-06-02 12:31:20.845949+00', '2026-06-02 12:31:20.845949+00', '2026-06-02 12:31:20.845949+00', 'creator-terms-2026-05', 'creator-privacy-2026-05', '2026-05-30 03:07:00.485351+00', NULL),
('b41929f0-bf22-485c-ab66-0981dd0137d7', '4325bf1e-cbfc-4bb0-9d66-095dc0653171', 'pending', 'brgbgrbgrbrgbgrbgrbrgbrgbgrbgrbgrbgrbgr', NULL, NULL, NULL, 'Pendiente de confirmacion de alta como creador por correo.', '2026-05-31 18:41:22.06689+00', 'ffdfd', 'JUAN', 'PUC', 'universidad politecnica de bacalar', 'chetumal', 'quintana roo', 'México', '9988515380', 'gefvgrvrgbrgbgrbgrbgrbgrbrgbgrbgrbgbr', '2026-06-02 12:33:30.891256+00', '2026-06-02 12:33:30.891256+00', '2026-06-02 12:33:30.891256+00', 'creator-terms-2026-05', 'creator-privacy-2026-05', '2026-05-31 14:44:02.059753+00', NULL),
('4ea301b9-2495-4931-a2d0-611bd7558e2a', 'ee09573f-6499-43f6-8fc6-8fa1092761fe', 'pending', 'dsdsdsdsdsds', NULL, NULL, NULL, 'Pendiente de confirmacion de alta como creador por correo.', '2026-06-10 16:12:23.282504+00', 'Guerrero Alvarado', 'Johanan', 'Guerrero', 'UTCHE', 'Bacalar', 'Quintana Roo', 'México', NULL, 'dsdsdsdsdsdsdsdsdsdsdsdsdsdsdsds', '2026-06-10 16:12:23.282504+00', '2026-06-10 16:12:23.282504+00', '2026-06-10 16:12:23.282504+00', 'creator-terms-2026-05', 'creator-privacy-2026-05', '2026-06-10 16:07:27.420278+00', NULL)
on conflict do nothing;

-- ========== system_settings ==========
INSERT INTO public.system_settings (key, value, is_public, updated_at, updated_by) VALUES ('maintenance', '{"enabled": false, "message": ""}', true, '2026-07-14 05:52:03.944022+00', NULL),
('announcement', '{"type": "info", "enabled": false, "message": ""}', true, '2026-07-14 05:52:03.944022+00', NULL),
('creator_registration', '{"open": true}', true, '2026-07-14 05:52:03.944022+00', NULL),
('upload_limit_mb', '{"value": 50}', false, '2026-07-14 05:52:03.944022+00', NULL)
on conflict do nothing;

-- ========== assets ==========
INSERT INTO public.assets (id, uploaded_by, asset_type, source_type, file_url, storage_path, external_url, mime_type, file_size, metadata, created_at) VALUES ('f3bf87fb-759a-4cf2-a141-4619b4661389', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/2c350eae-ebe9-4fdb-9d00-57a6dcf70f67/cover/1780586771955-chatgpt-image-30-may-2026-02_57_19.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/2c350eae-ebe9-4fdb-9d00-57a6dcf70f67/cover/1780586771955-chatgpt-image-30-may-2026-02_57_19.png', NULL, 'image/png', '2617065', '{"kind": "cover", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "2c350eae-ebe9-4fdb-9d00-57a6dcf70f67", "original_name": "ChatGPT Image 30 may 2026, 02_57_19.png", "safe_file_name": "chatgpt-image-30-may-2026-02_57_19.png"}', '2026-06-04 15:26:16.861652+00'),
('24323e8a-219c-4517-9b35-5ac9d3fcadf4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/3114c4cd-7292-4462-8647-7ac5ad72dd29/cover/1780645302672-chatgpt-image-30-may-2026-02_49_37.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/3114c4cd-7292-4462-8647-7ac5ad72dd29/cover/1780645302672-chatgpt-image-30-may-2026-02_49_37.png', NULL, 'image/png', '2376831', '{"kind": "cover", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "3114c4cd-7292-4462-8647-7ac5ad72dd29", "original_name": "ChatGPT Image 30 may 2026, 02_49_37.png", "safe_file_name": "chatgpt-image-30-may-2026-02_49_37.png"}', '2026-06-05 07:41:46.135883+00'),
('fd57c0c1-9df8-4bdc-a22e-0ad51aaac3b6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/3114c4cd-7292-4462-8647-7ac5ad72dd29/banner/1780645305032-libro-abierto.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/3114c4cd-7292-4462-8647-7ac5ad72dd29/banner/1780645305032-libro-abierto.png', NULL, 'image/png', '2992557', '{"kind": "banner", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "3114c4cd-7292-4462-8647-7ac5ad72dd29", "original_name": "Libro abierto.png", "safe_file_name": "libro-abierto.png"}', '2026-06-05 07:41:48.151319+00'),
('8248afb0-48dc-4e83-9440-542d150876c9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780813835937-portada_extranos-animales.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780813835937-portada_extranos-animales.png', NULL, 'image/png', '3427741', '{"kind": "cover", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "0b132ae9-db91-4a25-adcd-c023979bacbc", "original_name": "portada_extraños animales.png", "safe_file_name": "portada_extranos-animales.png"}', '2026-06-07 06:30:39.809032+00'),
('94efc458-f5b5-47a0-a5c9-d99a80f96426', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/0b132ae9-db91-4a25-adcd-c023979bacbc/banner/1780813841661-captura-de-pantalla-2026-05-29-195350.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/0b132ae9-db91-4a25-adcd-c023979bacbc/banner/1780813841661-captura-de-pantalla-2026-05-29-195350.png', NULL, 'image/png', '99740', '{"kind": "banner", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "0b132ae9-db91-4a25-adcd-c023979bacbc", "original_name": "Captura de pantalla 2026-05-29 195350.png", "safe_file_name": "captura-de-pantalla-2026-05-29-195350.png"}', '2026-06-07 06:30:42.106026+00'),
('387f15de-516e-44ec-99ff-1979843296c5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780814416744-captura-de-pantalla-2026-06-04-120225.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780814416744-captura-de-pantalla-2026-06-04-120225.png', NULL, 'image/png', '405938', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "0b132ae9-db91-4a25-adcd-c023979bacbc", "original_name": "Captura de pantalla 2026-06-04 120225.png"}', '2026-06-07 06:40:18.594861+00'),
('4f9e3ac9-5afa-4102-8aba-d0e2a75bae6d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780865897618-chatgpt-image-30-may-2026-02_49_37.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780865897618-chatgpt-image-30-may-2026-02_49_37.png', NULL, 'image/png', '2376831', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "0b132ae9-db91-4a25-adcd-c023979bacbc", "original_name": "ChatGPT Image 30 may 2026, 02_49_37.png"}', '2026-06-07 20:58:23.899316+00'),
('f08f31ba-0ed7-4656-a37d-d7da3b72d2bf', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780872909170-chatgpt-image-30-may-2026-02_46_15.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/0b132ae9-db91-4a25-adcd-c023979bacbc/cover/1780872909170-chatgpt-image-30-may-2026-02_46_15.png', NULL, 'image/png', '1626371', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "0b132ae9-db91-4a25-adcd-c023979bacbc", "original_name": "ChatGPT Image 30 may 2026, 02_46_15.png"}', '2026-06-07 22:55:13.856419+00'),
('43de3384-dedf-42cc-bcb5-c27d5733cc54', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6/documents/1780876511443-xd.pdf', NULL, 'application/pdf', '189455', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "extension": "pdf", "legend_id": "da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6", "original_name": "XD.pdf", "safe_file_name": "xd.pdf"}', '2026-06-07 23:55:12.003653+00'),
('1fa996ee-ee9f-459e-836f-26031a0b1064', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6/documents/1780876515277-xd.pdf', NULL, 'application/pdf', '189455', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "extension": "pdf", "legend_id": "da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6", "original_name": "XD.pdf", "safe_file_name": "xd.pdf"}', '2026-06-07 23:55:15.911593+00'),
('cb7bce39-77e4-42f2-bcf2-d014af27371c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6/cover/1780876602142-chatgpt_image_30_may_2026__02_49_37-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6/cover/1780876602142-chatgpt_image_30_may_2026__02_49_37-removebg-preview.png', NULL, 'image/png', '156431', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "da7d3d0e-9c3d-40b2-8327-5a2d0c24f8f6", "original_name": "ChatGPT_Image_30_may_2026__02_49_37-removebg-preview.png"}', '2026-06-07 23:56:45.100727+00'),
('0335b3b0-a1b9-43f7-86d8-b37e00b84d0d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/370b16ea-714c-41ce-99f0-f7ffb9332f99/documents/1780890171170-la_laguna_viva.pdf', NULL, 'application/pdf', '19637', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "extension": "pdf", "legend_id": "370b16ea-714c-41ce-99f0-f7ffb9332f99", "original_name": "La_Laguna_Viva.pdf", "safe_file_name": "la_laguna_viva.pdf"}', '2026-06-08 03:42:51.570719+00'),
('fcac0916-2832-4633-a880-4c65704816d7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/370b16ea-714c-41ce-99f0-f7ffb9332f99/cover/1780890944956-chatgpt-image-30-may-2026-02_34_59.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/370b16ea-714c-41ce-99f0-f7ffb9332f99/cover/1780890944956-chatgpt-image-30-may-2026-02_34_59.png', NULL, 'image/png', '1894346', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "370b16ea-714c-41ce-99f0-f7ffb9332f99", "original_name": "ChatGPT Image 30 may 2026, 02_34_59.png"}', '2026-06-08 03:55:49.200749+00'),
('06517509-2689-4514-8675-088a6c5ad38e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/370b16ea-714c-41ce-99f0-f7ffb9332f99/banner/1780929348655-chatgpt_image_30_may_2026__02_49_37-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/370b16ea-714c-41ce-99f0-f7ffb9332f99/banner/1780929348655-chatgpt_image_30_may_2026__02_49_37-removebg-preview.png', NULL, 'image/png', '156431', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "370b16ea-714c-41ce-99f0-f7ffb9332f99", "original_name": "ChatGPT_Image_30_may_2026__02_49_37-removebg-preview.png"}', '2026-06-08 14:35:52.748544+00'),
('30e84f9f-9b7f-4366-9234-8682d2dcd94a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd/cover/1780929795915-portada_figuritas-de-chicle.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd/cover/1780929795915-portada_figuritas-de-chicle.png', NULL, 'image/png', '9017558', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd", "original_name": "portada_figuritas de chicle.png"}', '2026-06-08 14:43:23.38174+00'),
('a06a4403-2893-4d54-94b3-d10b4f9e103e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd/banner/1780929826250-whatsapp-image-2026-05-22-at-9-24-07-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd/banner/1780929826250-whatsapp-image-2026-05-22-at-9-24-07-pm.jpeg', NULL, 'image/jpeg', '154796', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd", "original_name": "WhatsApp Image 2026-05-22 at 9.24.07 PM.jpeg"}', '2026-06-08 14:43:48.009004+00'),
('ad40d3e3-a9ce-4682-a269-66d94b220d3c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/337aa7a9-5173-4bb4-8ba4-9b20b487f466/documents/1781030797976-xd.pdf', NULL, 'application/pdf', '189455', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "extension": "pdf", "legend_id": "337aa7a9-5173-4bb4-8ba4-9b20b487f466", "original_name": "XD.pdf", "safe_file_name": "xd.pdf"}', '2026-06-09 18:46:39.737906+00'),
('60602780-718a-47fa-849d-76ddef895628', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/337aa7a9-5173-4bb4-8ba4-9b20b487f466/cover/1781030818381-chatgpt-image-8-jun-2026-22_22_20.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/337aa7a9-5173-4bb4-8ba4-9b20b487f466/cover/1781030818381-chatgpt-image-8-jun-2026-22_22_20.png', NULL, 'image/png', '2763483', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "337aa7a9-5173-4bb4-8ba4-9b20b487f466", "original_name": "ChatGPT Image 8 jun 2026, 22_22_20.png"}', '2026-06-09 18:47:05.970646+00'),
('d4edd4e4-bda1-41d7-8dc1-618b9e102305', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/9af98360-35a0-4c0a-81d5-8fac986dc75c/source_document/1781153429547-xd.pdf', NULL, 'application/pdf', '189455', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "9af98360-35a0-4c0a-81d5-8fac986dc75c", "original_name": "XD.pdf"}', '2026-06-11 04:50:33.133453+00'),
('f820d42f-3be8-443d-b052-83c553fbe509', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/840a8b36-365e-47e3-89af-4b11235b332b/source_document/1781156995983-la_laguna_viva.pdf', NULL, 'application/pdf', '19637', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "840a8b36-365e-47e3-89af-4b11235b332b", "original_name": "La_Laguna_Viva.pdf"}', '2026-06-11 05:49:58.702929+00'),
('ae5bc837-af47-4f1f-955c-12d23d31219e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/source_document/1781284886347-la-serpiente-del-mar.pdf', NULL, 'application/pdf', '604754', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "La serpiente del mar.pdf"}', '2026-06-12 17:21:29.833554+00'),
('e415ae03-079b-4f62-b743-0fb3957902c6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/cover/1781284928503-copilot_20260519_121344.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/cover/1781284928503-copilot_20260519_121344.png', NULL, 'image/png', '2992547', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "Copilot_20260519_121344.png"}', '2026-06-12 17:22:28.401757+00'),
('7246428f-ffce-4928-8b29-a169162360ff', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/banner/1781285287612-banner-serpiente-del-mar.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/banner/1781285287612-banner-serpiente-del-mar.png', NULL, 'image/png', '2909981', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "banner serpiente del mar.png"}', '2026-06-12 17:28:14.210951+00'),
('1594e87d-3a4b-4422-a046-54c9c4437330', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285458501-dragon-del-mar.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285458501-dragon-del-mar.glb', NULL, 'model/gltf-binary', '5686868', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "dragon del mar.glb", "safe_file_name": "dragon-del-mar.glb"}', '2026-06-12 17:31:02.721075+00'),
('9b109c89-2592-4d41-b854-34e6cce55c24', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285467793-dragon-del-mar.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285467793-dragon-del-mar.glb', NULL, 'model/gltf-binary', '5686868', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "dragon del mar.glb", "safe_file_name": "dragon-del-mar.glb"}', '2026-06-12 17:31:13.936902+00'),
('9374b039-b97c-488c-b682-08f1734df288', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285552917-dragon-del-mar.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/models/1781285552917-dragon-del-mar.glb', NULL, 'model/gltf-binary', '5686868', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "dragon del mar.glb", "safe_file_name": "dragon-del-mar.glb"}', '2026-06-12 17:32:38.013552+00'),
('75e83674-9786-4c71-938c-2081b822765d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/markers/1781285612822-callate-we.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/markers/1781285612822-callate-we.jpeg', NULL, 'image/jpeg', '45128', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "original_name": "callate we.jpeg", "safe_file_name": "callate-we.jpeg"}', '2026-06-12 17:33:34.966689+00'),
('00937b84-6ce6-4f18-928f-da6bf2d4db72', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '24922', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:16.476107+00'),
('d8317b8e-e826-4af5-8976-c8776b72a371', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '7286', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:16.938201+00'),
('1424b429-5e49-4080-b403-589f7e4d748c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '156217', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:17.727084+00'),
('a9da9a15-2b4b-40fb-881a-ab94e5d0ba5c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '90820', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:18.389423+00'),
('b1d3f992-377d-4ac9-94fa-a57766c960cc', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '94802', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:18.937539+00'),
('1d780584-6fca-47bb-a042-f94988caf6c8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '142360', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:19.524438+00'),
('f69793e6-2609-4fe9-8d28-5773a9bfabff', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '81193', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:20.154565+00'),
('34a4572b-d3f5-47b3-9c1e-4b310f037beb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-008.jpg', NULL, 'image/jpeg', '52716', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1", "version_id": null, "page_number": 8, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "57108ec7-8ba4-46c6-a2ac-0c636a99d6aa"}', '2026-06-12 22:19:20.688471+00'),
('9bbb918a-f9ca-4e98-9179-bac8c67708a7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/db0244f2-56bd-4b50-90e5-a528bd5914fc/source_document/1781460267796-el-sismite.pdf', NULL, 'application/pdf', '952197', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "original_name": "El sismite.pdf"}', '2026-06-14 18:04:34.346332+00'),
('daa31c1f-3995-48a7-b425-e9b6533b2ed4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '54047', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:51.606332+00'),
('127865fa-3e03-4320-8924-c83e9c828de2', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '111691', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:52.568254+00'),
('1e8d7a93-af74-4a17-bf9c-861e54cb7202', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '61591', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:53.475009+00'),
('52b476c9-40eb-4060-bef5-cd1c62d78a43', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '102891', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:53.985056+00'),
('b8096734-f2a4-4fc7-a52d-dc061443a76d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '99530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:54.986185+00'),
('95dfe0b2-5c0c-4ce9-ba12-9a002cda529a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '74963', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:55.549074+00'),
('0a8203b4-2fb0-4daa-9bcb-2cb5c8144f37', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/versions/source-e752d6c0-08f6-4b30-9b2d-5e0af9880c3a/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '182255', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e752d6c0-08f6-4b30-9b2d-5e0af9880c3a"}', '2026-06-14 18:04:57.106478+00'),
('2f03807b-bb6c-4bea-b448-dc662f3779ac', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/db0244f2-56bd-4b50-90e5-a528bd5914fc/cover/1781460862441-portada_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/db0244f2-56bd-4b50-90e5-a528bd5914fc/cover/1781460862441-portada_sismite.png', NULL, 'image/png', '793362', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "original_name": "Portada_sismite.png"}', '2026-06-14 18:14:28.078772+00'),
('d832ea5b-4014-48eb-8b04-a48f74c0da2d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/db0244f2-56bd-4b50-90e5-a528bd5914fc/banner/1781460873434-banner_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/db0244f2-56bd-4b50-90e5-a528bd5914fc/banner/1781460873434-banner_sismite.png', NULL, 'image/png', '2514535', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "original_name": "banner_sismite.png"}', '2026-06-14 18:14:38.464167+00'),
('6bd15825-6616-4847-a1db-deb9d641cdd9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/markers/1781460966678-marcador_sismite.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/markers/1781460966678-marcador_sismite.jpeg', NULL, 'image/jpeg', '17288', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "original_name": "marcador_sismite.jpeg", "safe_file_name": "marcador_sismite.jpeg"}', '2026-06-14 18:16:08.250622+00'),
('1d3bf402-44e8-46e9-a67c-ac390e0faaaa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/models/1781461213705-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/db0244f2-56bd-4b50-90e5-a528bd5914fc/models/1781461213705-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "db0244f2-56bd-4b50-90e5-a528bd5914fc", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-14 18:20:17.864203+00'),
('21c07bf3-5952-4b96-b52f-38ef1889db04', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/2bf7a5dc-8f6b-42f5-9a00-717488542088/source_document/1781463283430-el-sismite.pdf', NULL, 'application/pdf', '952197', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "original_name": "El sismite.pdf"}', '2026-06-14 18:54:48.240641+00'),
('d420672e-d5a0-469e-8f06-3c74c94e9a8b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/2bf7a5dc-8f6b-42f5-9a00-717488542088/cover/1781463436435-portada_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/2bf7a5dc-8f6b-42f5-9a00-717488542088/cover/1781463436435-portada_sismite.png', NULL, 'image/png', '793362', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "original_name": "Portada_sismite.png"}', '2026-06-14 18:57:18.191469+00'),
('6f3f4c6c-4416-4a14-9e83-53a7f7aa3b8e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/2bf7a5dc-8f6b-42f5-9a00-717488542088/banner/1781463449977-banner_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/2bf7a5dc-8f6b-42f5-9a00-717488542088/banner/1781463449977-banner_sismite.png', NULL, 'image/png', '2514535', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "original_name": "banner_sismite.png"}', '2026-06-14 18:57:33.054565+00'),
('95589906-5b0a-4119-9c1e-20fa2635b58e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '54047', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:00.013866+00'),
('07551b8f-0986-4be4-b59c-bf0fab88cc1d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '111691', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:01.075647+00'),
('b9c752d5-e010-4dba-a782-4f901b9e16da', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '61591', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:02.097066+00'),
('7ab95188-443e-4576-b942-ddd6d704a465', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '102891', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:02.996811+00'),
('2ea78376-6e39-40bc-95dc-14b9215fd410', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '99530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:03.880412+00'),
('ec739a1a-932b-4570-ab3c-9a0746ce85d5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '74963', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:04.302722+00'),
('e3f281fc-88a4-46f9-bfc7-0b6bba104ba7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/versions/source-03bdc2ac-d203-43e3-98cc-d6e569be3361/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '182255', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "03bdc2ac-d203-43e3-98cc-d6e569be3361"}', '2026-06-14 18:59:05.851008+00'),
('3d445213-5673-4c3e-9f22-25e0dbcff609', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/markers/1781463664577-marcador_sismite.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/2bf7a5dc-8f6b-42f5-9a00-717488542088/markers/1781463664577-marcador_sismite.jpeg', NULL, 'image/jpeg', '17288', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "2bf7a5dc-8f6b-42f5-9a00-717488542088", "original_name": "marcador_sismite.jpeg", "safe_file_name": "marcador_sismite.jpeg"}', '2026-06-14 19:01:05.967071+00'),
('872e188a-4378-4f03-9f10-44b7ad8c2026', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/dca188a7-8d8f-44d2-903d-2ce27f57dff5/source_document/1781490513624-el-sismite.pdf', NULL, 'application/pdf', '952197', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.pdf"}', '2026-06-15 02:28:35.425482+00'),
('d09bea59-fdf0-4767-93ff-11f60841d6be', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/dca188a7-8d8f-44d2-903d-2ce27f57dff5/cover/1781490534327-portada_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/dca188a7-8d8f-44d2-903d-2ce27f57dff5/cover/1781490534327-portada_sismite.png', NULL, 'image/png', '793362', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "Portada_sismite.png"}', '2026-06-15 02:28:56.587308+00'),
('04ecb7f3-5194-4b48-8289-cdeaa6287dc7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/dca188a7-8d8f-44d2-903d-2ce27f57dff5/banner/1781490537866-banner_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/dca188a7-8d8f-44d2-903d-2ce27f57dff5/banner/1781490537866-banner_sismite.png', NULL, 'image/png', '2514535', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "banner_sismite.png"}', '2026-06-15 02:29:00.964495+00'),
('1afe0ea7-de21-4884-95d6-8b40aae23aed', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '54047', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:53.866662+00'),
('f7ea6953-c315-40f5-8cf4-6ff685af5876', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '111691', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:54.927814+00'),
('3e066dbf-b6a4-415c-b873-43e9eac5fdf6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '61591', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:55.860189+00'),
('d9e09055-87b2-4da3-b736-bde860c3b8f0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '102891', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:56.481545+00'),
('536f25a7-ac7e-4331-a142-e7f17693909a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '99530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:57.445987+00'),
('8f950e5d-a78e-447a-bfdf-07ce878ce55f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '74963', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:57.875536+00'),
('aeee5981-b89c-429e-bf48-df1fa47941c0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/versions/source-12edd00f-f2d3-4ad5-b064-7c9d1c9e4036/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '182255', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "12edd00f-f2d3-4ad5-b064-7c9d1c9e4036"}', '2026-06-15 02:29:59.219171+00'),
('8dca86ae-528e-49a3-adc4-b61008838fc7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/markers/1781490727459-marcador_sismite.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/markers/1781490727459-marcador_sismite.jpeg', NULL, 'image/jpeg', '17288', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "marcador_sismite.jpeg", "safe_file_name": "marcador_sismite.jpeg"}', '2026-06-15 02:32:09.597885+00'),
('a6c38227-a506-47e0-9eea-794a01a25390', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495270337-upb_real.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495270337-upb_real.glb', NULL, 'model/gltf-binary', '6057836', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "upb_real.glb", "safe_file_name": "upb_real.glb"}', '2026-06-15 03:48:03.402186+00'),
('ea49c22a-a68d-42ee-9e46-28ec03369107', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495304053-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495304053-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 03:48:27.682641+00'),
('af218f9b-abf9-49cb-bd09-ffb8b69292bf', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495310001-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495310001-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 03:48:33.498889+00'),
('dc7a8e8e-0999-42c2-b571-cff60a5e529b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495332608-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781495332608-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 03:48:56.138623+00'),
('c2cb58e7-4775-41d8-8d65-3e5c2d185f4d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781496357368-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781496357368-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 04:06:02.847154+00'),
('3fc493fa-d659-4e97-84a5-b8f64eebf22e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781497433386-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781497433386-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 04:23:58.017286+00'),
('3c23eb29-4f2e-446e-b542-1b45a22c2536', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781524022389-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781524022389-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 11:47:05.669332+00'),
('cc69051a-f591-4512-b3e8-1b5bda553a19', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781526352721-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781526352721-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 12:25:54.49963+00'),
('96cb96ee-753f-4a1b-b094-012a3806ba13', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781526537893-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781526537893-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 12:29:00.99277+00'),
('b2b015e0-a193-42f2-9427-2cf374f0c034', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781527600812-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/dca188a7-8d8f-44d2-903d-2ce27f57dff5/models/1781527600812-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "dca188a7-8d8f-44d2-903d-2ce27f57dff5", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 12:46:43.884205+00'),
('fa85e098-63aa-4a13-8d1a-175a129d554d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/acb6068f-0884-469a-8741-d913b6baffe4/source_document/1781527700671-el-sismite.pdf', NULL, 'application/pdf', '952197', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "El sismite.pdf"}', '2026-06-15 12:48:22.395758+00'),
('464e5923-d774-4908-9385-7fb0a9ec7bde', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/acb6068f-0884-469a-8741-d913b6baffe4/cover/1781527723958-portada_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/acb6068f-0884-469a-8741-d913b6baffe4/cover/1781527723958-portada_sismite.png', NULL, 'image/png', '793362', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "Portada_sismite.png"}', '2026-06-15 12:48:45.338202+00'),
('60f2998e-1dbd-4cb0-be7d-3b8365872a8e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/acb6068f-0884-469a-8741-d913b6baffe4/banner/1781527726598-chatgpt-image-14-jun-2026-13_12_06.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/acb6068f-0884-469a-8741-d913b6baffe4/banner/1781527726598-chatgpt-image-14-jun-2026-13_12_06.png', NULL, 'image/png', '2008019', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "ChatGPT Image 14 jun 2026, 13_12_06.png"}', '2026-06-15 12:48:49.480927+00'),
('952baa24-cfd9-4c84-98a3-a46b142a63cf', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781527760933-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781527760933-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 12:49:22.553599+00'),
('9176ba15-f0fc-468d-986e-4276cd6baade', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/markers/1781527770105-marcador_sismite.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/markers/1781527770105-marcador_sismite.jpeg', NULL, 'image/jpeg', '17288', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "marcador_sismite.jpeg", "safe_file_name": "marcador_sismite.jpeg"}', '2026-06-15 12:49:30.540356+00'),
('7d8d23b7-9073-4cce-97ed-d6df8209273a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '54047', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:17.56511+00'),
('a1822661-495b-4b4e-9b72-e812cfeeb22a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '111691', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:19.138225+00'),
('b52c9475-4c8e-4706-9921-4b6940ca5ccb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '61591', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:20.301573+00'),
('a3fb84bf-65e6-4bd2-b8e8-69287a9cdf3a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '102891', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:20.853125+00'),
('700d9b32-d431-4ffb-bd35-62e9325ba5f9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '99530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:22.013363+00'),
('017754d6-63cd-4771-8666-0d4a445959e4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '74963', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:22.524897+00'),
('e6d2ba70-4063-4a35-92f7-dd5098e0d652', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/acb6068f-0884-469a-8741-d913b6baffe4/versions/source-ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '182255', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "ee8d7fc0-e07b-4a7d-9cd1-cb4aaaa34676"}', '2026-06-15 12:51:23.842859+00'),
('17b5fb97-e5ed-4f66-a13a-635032acb091', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781527902853-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781527902853-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 12:51:44.615271+00'),
('77733ec5-2da5-4900-abf4-2307096366ba', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781531991645-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/acb6068f-0884-469a-8741-d913b6baffe4/models/1781531991645-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "acb6068f-0884-469a-8741-d913b6baffe4", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-15 14:00:00.994698+00'),
('86b0982f-1e3c-4c9a-9b8c-6e9c7554a3f0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/b104991d-963b-48b1-b627-45f039e9f36a/cover/1781532425235-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/b104991d-963b-48b1-b627-45f039e9f36a/cover/1781532425235-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "b104991d-963b-48b1-b627-45f039e9f36a", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-15 14:07:08.02669+00'),
('26b51a77-b758-4178-8ccc-a2bad284ebbd', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/b104991d-963b-48b1-b627-45f039e9f36a/banner/1781532434817-chatgpt-image-14-jun-2026-13_12_06.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/b104991d-963b-48b1-b627-45f039e9f36a/banner/1781532434817-chatgpt-image-14-jun-2026-13_12_06.png', NULL, 'image/png', '2008019', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "b104991d-963b-48b1-b627-45f039e9f36a", "original_name": "ChatGPT Image 14 jun 2026, 13_12_06.png"}', '2026-06-15 14:07:24.189642+00'),
('0c4f06e3-3a53-4622-9224-e4897c3c03fc', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/df1294d8-9340-4bd7-9b3b-3a9df675019e/source_document/1781713205323-el-sisimite.pdf', NULL, 'application/pdf', '923251', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "El sisimite.pdf"}', '2026-06-17 16:20:07.085388+00'),
('99307dae-f4be-402d-9f31-88c47bcd64f3', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/df1294d8-9340-4bd7-9b3b-3a9df675019e/cover/1781713234260-portada_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/df1294d8-9340-4bd7-9b3b-3a9df675019e/cover/1781713234260-portada_sismite.png', NULL, 'image/png', '793362', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "Portada_sismite.png"}', '2026-06-17 16:20:36.506831+00'),
('b1e1eba2-7fd6-40fb-b2bc-2cf4059e7169', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/df1294d8-9340-4bd7-9b3b-3a9df675019e/banner/1781713240018-banner_sismite.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/df1294d8-9340-4bd7-9b3b-3a9df675019e/banner/1781713240018-banner_sismite.png', NULL, 'image/png', '2514535', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "banner_sismite.png"}', '2026-06-17 16:20:42.89376+00'),
('7d9d3c49-b2cc-4050-9a88-94021f2d59fb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781713406227-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781713406227-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-17 16:23:29.981474+00'),
('556dfee7-0b76-47d2-8cf4-d61ea05ed134', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/markers/1781713408426-leyendas-de-bacalar-30.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/markers/1781713408426-leyendas-de-bacalar-30.png', NULL, 'image/png', '493489', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "Leyendas de Bacalar (30).png", "safe_file_name": "leyendas-de-bacalar-30.png"}', '2026-06-17 16:23:31.222432+00'),
('0d26e28e-11ea-4aaa-8e5c-db4dea5aeefb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '54047', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:25.589143+00'),
('9f551373-0793-4280-b151-359548e3ee7f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '111691', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:27.012152+00'),
('a3c139ca-0701-4c6b-95a6-50ac7c69581e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '22418', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:27.647462+00'),
('93b239a3-676a-4a37-8b02-f39bd265e877', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '101906', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:28.710844+00'),
('6ff01c08-7327-40c6-907e-338aa3924fd8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '99530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:30.19356+00'),
('66bb2d15-0137-4090-9db5-53489e5da2c0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '74963', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:30.601365+00'),
('ea00ea6e-cfa4-44ff-9b72-a75f77b30879', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/versions/source-48fd20bd-ae5c-42aa-a812-cdcf41475194/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '182255', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "48fd20bd-ae5c-42aa-a812-cdcf41475194"}', '2026-06-17 16:24:31.972766+00'),
('f1fe2237-d935-4260-a2c2-e706c51074bb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781713477675-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781713477675-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-17 16:24:43.351016+00'),
('3624b79c-d0d7-4566-a5a0-f2ae2ddb2f28', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781716769537-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/df1294d8-9340-4bd7-9b3b-3a9df675019e/models/1781716769537-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "df1294d8-9340-4bd7-9b3b-3a9df675019e", "original_name": "El sismite.glb", "safe_file_name": "el-sismite.glb"}', '2026-06-17 17:19:38.275038+00'),
('8bd30090-3336-46c2-86d9-bc00e68a0bd9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/49d40744-880c-41bf-8b07-7584eaafc354/cover/1781798162847-portada_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/49d40744-880c-41bf-8b07-7584eaafc354/cover/1781798162847-portada_baymen.png', NULL, 'image/png', '581727', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "49d40744-880c-41bf-8b07-7584eaafc354", "original_name": "Portada_baymen.png"}', '2026-06-18 15:56:04.725775+00'),
('c5ce064e-14f5-4be3-8441-6862a96c23b8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/49d40744-880c-41bf-8b07-7584eaafc354/banner/1781798170882-banner_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/49d40744-880c-41bf-8b07-7584eaafc354/banner/1781798170882-banner_baymen.png', NULL, 'image/png', '317314', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "49d40744-880c-41bf-8b07-7584eaafc354", "original_name": "banner_baymen.png"}', '2026-06-18 15:56:12.884642+00'),
('a9ff0dc9-0ed9-46b9-b391-36c6f1b3deeb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/source_document/1781801237138-los_baymen_formato_libro_paginas_individuales_compressed-1.pdf', NULL, 'application/pdf', '4362441', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "Los_Baymen_formato_libro_paginas_individuales_compressed (1).pdf"}', '2026-06-18 16:47:21.255019+00'),
('4605919c-ed6d-4815-b470-e733c4ce55c9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/cover/1781801266163-portada_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/cover/1781801266163-portada_baymen.png', NULL, 'image/png', '581727', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "Portada_baymen.png"}', '2026-06-18 16:47:50.119911+00'),
('194c5b90-e8cd-482d-af74-361f646049ec', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/banner/1781801267539-banner_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/banner/1781801267539-banner_baymen.png', NULL, 'image/png', '317314', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "banner_baymen.png"}', '2026-06-18 16:47:50.519758+00'),
('50aa6cf4-024f-45b3-9616-1c4d13be6711', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '133755', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:25.194867+00'),
('89228f24-ca60-4d80-8613-dc2a57bffd48', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '104757', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:28.890054+00'),
('fa596f61-ffeb-43e4-b2e4-95339773f071', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '83275', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:32.183154+00'),
('c84f8077-3d61-4da3-8d2a-42927637cfe7', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '89772', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:34.814881+00'),
('42a75499-bd92-420f-acf9-ce9b6e5dd97c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '57037', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:37.560052+00'),
('341cb9f0-f061-4743-aced-893b9a634e8b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '50704', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:39.879132+00'),
('0f1e4c2e-0ff1-4801-a00a-a8428c77bcf6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '56049', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:42.180636+00'),
('fca0bccb-2399-4ebf-a7e9-531ca3b01342', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-008.jpg', NULL, 'image/jpeg', '84880', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 8, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:44.662314+00'),
('9bf702cf-fd95-497e-abf7-5579aa8af01c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-009.jpg', NULL, 'image/jpeg', '49533', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 9, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:47.145497+00'),
('5e5b4ac7-3b3a-4caa-84d1-5ed06e0e5c4a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-010.jpg', NULL, 'image/jpeg', '46847', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 10, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:49.66203+00'),
('494da521-116d-4a66-adc3-728f3a30f9ed', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-011.jpg', NULL, 'image/jpeg', '90394', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 11, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:52.036277+00'),
('a9a0e6ad-33b4-4447-bbf7-f4cac193c9f9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-014.jpg', NULL, 'image/jpeg', '98587', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 14, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:59.577063+00'),
('3c687854-166b-49be-a09b-95c1e77f3a21', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801333245-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801333245-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb", "safe_file_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-06-18 16:49:05.826158+00'),
('b5c9e7f6-800d-4d68-b5d1-de73365ae021', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-020.jpg', NULL, 'image/jpeg', '48237', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 20, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:17.185177+00'),
('d9463f1a-ffee-4db0-b00c-94d408753f04', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-021.jpg', NULL, 'image/jpeg', '65605', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 21, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:19.947252+00'),
('bbf7a7f1-62cd-4707-af8d-c78091d00e9d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-022.jpg', NULL, 'image/jpeg', '41222', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 22, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:22.646444+00'),
('bb66be89-075c-436b-a263-edb7bde0d829', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-025.jpg', NULL, 'image/jpeg', '55494', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 25, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:29.463368+00'),
('fd6e88d5-ae6a-4970-bff6-7d6b8d93e882', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-030.jpg', NULL, 'image/jpeg', '37386', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 30, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:41.647568+00'),
('c88d95f4-796a-49a7-95c8-180d29e0ef01', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-012.jpg', NULL, 'image/jpeg', '55568', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 12, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:54.806303+00'),
('d059f2d2-9667-4149-84ad-9867fa60c26d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-015.jpg', NULL, 'image/jpeg', '57803', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 15, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:01.601597+00'),
('6ea436c1-b311-4732-b32b-57aaf2f84620', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-024.jpg', NULL, 'image/jpeg', '38493', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 24, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:26.846826+00'),
('ca610b69-8037-461e-80b1-a5b014d2562e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-028.jpg', NULL, 'image/jpeg', '103676', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 28, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:37.388666+00'),
('e1ceee96-08ea-4d02-b25e-95951b04eb23', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-031.jpg', NULL, 'image/jpeg', '49601', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 31, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:43.355107+00'),
('9aa6ea8a-5879-4f05-9aff-43e03d2be361', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-013.jpg', NULL, 'image/jpeg', '76056', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 13, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:48:57.373789+00'),
('6b4b6a29-d735-49b7-937a-c46cae90f76f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-016.jpg', NULL, 'image/jpeg', '44523', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 16, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:04.284525+00'),
('1ee3d34d-06be-40b7-9bcd-33e700f15484', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-017.jpg', NULL, 'image/jpeg', '45757', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 17, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:06.855795+00'),
('86eac6db-6ba6-4663-903d-32898d95a7a8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-018.jpg', NULL, 'image/jpeg', '57770', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 18, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:10.660746+00'),
('06d3458a-8027-455a-9c95-6ea8c3866fcc', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-019.jpg', NULL, 'image/jpeg', '36167', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 19, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:14.657155+00'),
('dcc771ba-9b13-4c6b-b251-1069d0b83ee4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-023.jpg', NULL, 'image/jpeg', '34107', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 23, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:24.624576+00'),
('0ca3ffed-3e4a-4561-b265-44bcba0a27a2', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-026.jpg', NULL, 'image/jpeg', '70856', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 26, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:32.088923+00'),
('28ebe225-2e53-46db-845d-303dba9bccfa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-027.jpg', NULL, 'image/jpeg', '43832', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 27, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:34.738091+00'),
('76e1b935-2db4-4457-94ea-e51782077585', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-029.jpg', NULL, 'image/jpeg', '98129', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 29, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:39.695224+00'),
('9942b2b3-2724-4942-b674-94d7cb80b180', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/versions/source-e88f7b35-f484-4d73-9027-0a4cd838e58e/rendered-pages/page-032.jpg', NULL, 'image/jpeg', '112583', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "version_id": null, "page_number": 32, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "e88f7b35-f484-4d73-9027-0a4cd838e58e"}', '2026-06-18 16:49:45.917089+00'),
('ab084bd5-1341-4102-9463-ad0fd811f06f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801385775-6ff0c527-a500-410c-ada0-abb8393c2680.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801385775-6ff0c527-a500-410c-ada0-abb8393c2680.glb', NULL, 'model/gltf-binary', '8128792', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "6ff0c527-a500-410c-ada0-abb8393c2680.glb", "safe_file_name": "6ff0c527-a500-410c-ada0-abb8393c2680.glb"}', '2026-06-18 16:49:57.468183+00'),
('0b1545d3-f839-44a5-b988-279e2b70a0e8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801414038-ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/models/1781801414038-ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', NULL, 'model/gltf-binary', '7982996', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb", "safe_file_name": "ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb"}', '2026-06-18 16:50:28.802117+00'),
('c11d1861-3ee7-4792-889f-522ee17b44ee', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801598395-whatsapp-image-2026-06-17-at-4-13-28-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801598395-whatsapp-image-2026-06-17-at-4-13-28-pm.jpeg', NULL, 'image/jpeg', '14786', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "WhatsApp Image 2026-06-17 at 4.13.28 PM.jpeg", "safe_file_name": "whatsapp-image-2026-06-17-at-4-13-28-pm.jpeg"}', '2026-06-18 16:53:20.741261+00'),
('26fc57ea-9dcd-45fe-8c72-91ddb533b238', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801743994-whatsapp-image-2026-06-18-at-9-30-44-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801743994-whatsapp-image-2026-06-18-at-9-30-44-am.jpeg', NULL, 'image/jpeg', '15453', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "WhatsApp Image 2026-06-18 at 9.30.44 AM.jpeg", "safe_file_name": "whatsapp-image-2026-06-18-at-9-30-44-am.jpeg"}', '2026-06-18 16:55:46.417209+00'),
('2743de34-1cee-4f17-91be-004b06e0e0e4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801793865-whatsapp-image-2026-06-18-at-9-31-06-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba/markers/1781801793865-whatsapp-image-2026-06-18-at-9-31-06-am.jpeg', NULL, 'image/jpeg', '18281', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "e4fdd20e-4e5c-4ccd-9cb4-1ed73401f6ba", "original_name": "WhatsApp Image 2026-06-18 at 9.31.06 AM.jpeg", "safe_file_name": "whatsapp-image-2026-06-18-at-9-31-06-am.jpeg"}', '2026-06-18 16:56:36.159374+00'),
('58ad8e05-7997-4173-b5fe-bd0bd5f8a9e9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/74d2e940-2fd4-45ad-9698-a273058569ac/models/1781974027891-6ff0c527-a500-410c-ada0-abb8393c2680.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/74d2e940-2fd4-45ad-9698-a273058569ac/models/1781974027891-6ff0c527-a500-410c-ada0-abb8393c2680.glb', NULL, 'model/gltf-binary', '8128792', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "6ff0c527-a500-410c-ada0-abb8393c2680.glb", "safe_file_name": "6ff0c527-a500-410c-ada0-abb8393c2680.glb"}', '2026-06-20 16:47:22.365461+00'),
('6cc5b9f3-a171-43df-9582-6a5580f8a2ab', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/74d2e940-2fd4-45ad-9698-a273058569ac/markers/1781979923178-leyendas-de-bacalar-48.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/74d2e940-2fd4-45ad-9698-a273058569ac/markers/1781979923178-leyendas-de-bacalar-48.png', NULL, 'image/png', '282005', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "png", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "Leyendas de Bacalar (48).png", "safe_file_name": "leyendas-de-bacalar-48.png"}', '2026-06-20 18:25:26.79351+00'),
('212b1161-acad-4858-a3c5-27e42978db66', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782016905776-leyendas-de-bacalar-47.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782016905776-leyendas-de-bacalar-47.png', NULL, 'image/png', '71942', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "Leyendas de Bacalar (47).png"}', '2026-06-21 04:41:47.012012+00'),
('f60dfaaa-c4f6-42fd-8226-bb5288e3dd2c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782017793237-8-jpg.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782017793237-8-jpg.jpeg', NULL, 'image/jpeg', '91101', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "8.jpg.jpeg"}', '2026-06-21 04:56:34.349493+00'),
('5879d814-df90-401b-a6ca-cee9643262b2', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782017868876-captura_de_pantalla_2026-06-18_103715-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782017868876-captura_de_pantalla_2026-06-18_103715-removebg-preview.png', NULL, 'image/png', '130594', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "Captura_de_pantalla_2026-06-18_103715-removebg-preview.png"}', '2026-06-21 04:57:50.507054+00'),
('da61c5e5-171d-45a6-acda-41db8f51c511', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056376572-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056376572-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-21 15:39:38.229019+00'),
('66a2006b-e5e3-4f6f-b871-0c79db7846b1', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/model_3d/1782056440370-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/model_3d/1782056440370-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "El sismite.glb"}', '2026-06-21 15:40:43.984075+00'),
('a431287a-63c7-44dd-b67e-c9d39ba3cdaa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056486767-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056486767-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-21 15:41:29.173307+00'),
('e8cc070d-3e07-4646-a265-6b6e37d9b287', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056598136-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782056598136-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-21 15:43:20.99455+00'),
('481ccac9-7067-43cd-9eaf-29b41f86b2fe', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074565920-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074565920-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-21 20:42:47.674727+00'),
('68583f2a-05bd-46c4-bf89-71048c280c3f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074664092-cenote_labruja1.jpg', '2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074664092-cenote_labruja1.jpg', NULL, 'image/jpeg', '173994', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "74d2e940-2fd4-45ad-9698-a273058569ac", "original_name": "CENOTE_LABRUJA1.jpg"}', '2026-06-21 20:44:25.565394+00'),
('580ff50e-e449-4704-bc3e-2b12ebc18d1b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782506278943-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782506278943-chatgpt_image_13_jun_2026__18_23_15-removebg-preview.png', NULL, 'image/png', '458943', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "ChatGPT_Image_13_jun_2026__18_23_15-removebg-preview.png"}', '2026-06-26 20:38:00.953602+00'),
('1f952d8f-3820-4181-9a59-cb7a5999f426', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg', NULL, 'image/jpeg', '91101', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "8.jpg.jpeg"}', '2026-06-29 14:11:13.331929+00'),
('f899db0d-021e-411d-a54f-c91e739f47cc', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742285548-6ff0c527-a500-410c-ada0-abb8393c2680.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742285548-6ff0c527-a500-410c-ada0-abb8393c2680.glb', NULL, 'model/gltf-binary', '8128792', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "6ff0c527-a500-410c-ada0-abb8393c2680.glb"}', '2026-06-29 14:11:32.703517+00'),
('9c603ed6-e766-453a-8506-ddd1f0523893', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742338703-banner_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742338703-banner_baymen.png', NULL, 'image/png', '317314', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "banner_baymen.png"}', '2026-06-29 14:12:20.469353+00'),
('2c307a27-bee4-4fab-98cf-104e4d1dddc0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742445500-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742445500-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-06-29 14:14:09.525746+00'),
('deb9adaf-0f93-48b2-9b9d-1755207d2000', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/source_document/1782742888279-los_baymen_formato_libro_paginas_individuales_compressed-1.pdf', NULL, 'application/pdf', '4362441', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "original_name": "Los_Baymen_formato_libro_paginas_individuales_compressed (1).pdf"}', '2026-06-29 14:21:31.328012+00'),
('6e1a58ce-f8c3-477b-9002-42fac7283b69', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '133755', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:50.234126+00'),
('adcc2464-a4bf-4789-8c6d-7c9843b3554f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '104757', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:50.869272+00'),
('d1875049-c0fe-40dd-8c77-1e59d3f69b36', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '83275', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:51.425952+00'),
('96ec27a5-ea94-4971-ac1e-f6a62e6fcbb0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '89772', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:51.9915+00'),
('56c93bc8-b85f-4d09-963b-b1a3146e80f5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '57037', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:52.553671+00'),
('15ba0d58-8096-4459-abd8-2d9eaca82c1e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '50704', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:53.000777+00'),
('263a382f-efa7-4741-b1b9-c35a0c0937f3', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-009.jpg', NULL, 'image/jpeg', '49533', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 9, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:54.431009+00'),
('3dac93bd-dd1e-49d2-9ec9-53582a40f3c3', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-012.jpg', NULL, 'image/jpeg', '55568', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 12, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:55.943252+00'),
('a59195a0-deec-4555-be44-2d8b6fdc9f99', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-015.jpg', NULL, 'image/jpeg', '57803', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 15, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:57.349071+00'),
('61fe0ebd-53cb-44bd-af3d-503ff89674d5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-018.jpg', NULL, 'image/jpeg', '57770', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 18, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:59.243464+00'),
('71a8fa7d-0ad1-4c49-ac86-d36f9c00ec11', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-021.jpg', NULL, 'image/jpeg', '65605', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 21, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:00.956098+00'),
('dba86a53-da81-47ff-ac3f-3951506d07fa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-024.jpg', NULL, 'image/jpeg', '38493', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 24, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:02.313339+00'),
('a1171a26-bc33-4b7c-bcee-4d456cf9aac6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-027.jpg', NULL, 'image/jpeg', '43832', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 27, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:03.707151+00'),
('95f2beb9-3a7d-4ee2-b920-ea56b1b9c5f9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-030.jpg', NULL, 'image/jpeg', '37386', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 30, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:05.252384+00'),
('c3ad3b2b-2277-4b2d-ac45-0fbb8270cc4b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '56049', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:53.486155+00'),
('333cec87-4066-4244-9020-86b8c306e2f1', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-010.jpg', NULL, 'image/jpeg', '46847', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 10, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:54.968513+00'),
('c9ba0f66-524b-45ef-a5ae-6d904fa7cd4e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-013.jpg', NULL, 'image/jpeg', '76056', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 13, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:56.467295+00'),
('c05d0d40-bdd6-46a6-96f6-9bfffce424a1', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-016.jpg', NULL, 'image/jpeg', '44523', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 16, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:57.92641+00'),
('a5cd55eb-c0ae-48c6-aeb7-592ab72d7f4a', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-019.jpg', NULL, 'image/jpeg', '36167', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 19, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:59.857309+00'),
('48e07b97-a9d0-44f5-ba0d-4ddfa20e7253', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-022.jpg', NULL, 'image/jpeg', '41222', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 22, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:01.395426+00'),
('74f40c05-667b-4bd8-88b8-b74fefc4bad8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-025.jpg', NULL, 'image/jpeg', '55494', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 25, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:02.766493+00'),
('6c69cb3e-371a-4342-b72a-3d1e9366b266', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-028.jpg', NULL, 'image/jpeg', '103676', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 28, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:04.227369+00'),
('cb47e009-9bc5-4486-977f-8e05c70d6f96', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-031.jpg', NULL, 'image/jpeg', '49601', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 31, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:05.733252+00'),
('863ea0dc-c5f2-4031-9cab-44f47c9ed308', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-008.jpg', NULL, 'image/jpeg', '84880', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 8, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:53.977447+00'),
('b5db6d3e-0b9b-46e3-9c45-81beae2f2617', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-011.jpg', NULL, 'image/jpeg', '90394', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 11, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:55.497152+00'),
('410aadef-a310-41b1-9533-93fc267c235e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-014.jpg', NULL, 'image/jpeg', '98587', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 14, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:56.9178+00'),
('d213a9fd-e140-452f-abbc-0485aa44feea', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-017.jpg', NULL, 'image/jpeg', '45757', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 17, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:21:58.468827+00'),
('f210d7c3-09de-4246-bf8d-c083d4c04f30', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-020.jpg', NULL, 'image/jpeg', '48237', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 20, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:00.42915+00'),
('298c2dbc-8591-43b5-8754-b5d9ac7ec6e8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-023.jpg', NULL, 'image/jpeg', '34107', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 23, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:01.887507+00'),
('897d329a-f4a1-454d-a937-3ed783b11054', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-026.jpg', NULL, 'image/jpeg', '70856', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 26, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:03.242851+00'),
('498d1e9d-e683-4dfd-a471-73499d7d185f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-029.jpg', NULL, 'image/jpeg', '98129', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 29, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:04.662996+00'),
('f6a9998b-79e0-425c-942d-7f42d01d287f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-032.jpg', NULL, 'image/jpeg', '112583', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "version_id": null, "page_number": 32, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "60b51612-781c-405f-a22c-4614254ae93c"}', '2026-06-29 14:22:06.269082+00'),
('3edbe1c9-6804-455f-9c30-f621b797030d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/models/1782742996763-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/models/1782742996763-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb", "safe_file_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-06-29 14:23:23.706376+00'),
('3a4dfcbe-7b3a-4f2e-aa43-d545ff65898f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/markers/1782743054690-marcador_sismite.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/markers/1782743054690-marcador_sismite.jpeg', NULL, 'image/jpeg', '17288', '{"kind": "marker_image", "bucket": "legend-assets", "public": true, "extension": "jpeg", "legend_id": "ddf1014f-1b3b-4d5c-aa24-bc22001f3670", "original_name": "marcador_sismite.jpeg", "safe_file_name": "marcador_sismite.jpeg"}', '2026-06-29 14:24:18.994941+00'),
('298e68d3-8b12-42f9-b805-e83ad81efc63', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/profiles/cover/1783302333387-whatsapp-image-2026-07-05-at-9-13-12-am-1.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/profiles/cover/1783302333387-whatsapp-image-2026-07-05-at-9-13-12-am-1.jpeg', NULL, 'image/jpeg', '194328', '{"kind": "creator_cover", "bucket": "legend-assets", "context": "creator_profile", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM (1).jpeg"}', '2026-07-06 01:45:35.925936+00'),
('3a1a4549-b83d-480e-a72d-b8df975da31f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/profiles/cover/1783302530242-whatsapp-image-2026-07-05-at-9-13-12-am-1.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/profiles/cover/1783302530242-whatsapp-image-2026-07-05-at-9-13-12-am-1.jpeg', NULL, 'image/jpeg', '194328', '{"kind": "creator_cover", "bucket": "legend-assets", "context": "creator_profile", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM (1).jpeg"}', '2026-07-06 01:48:53.119614+00'),
('a4665253-0659-4850-ac74-304b61bc4043', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/abd56927-c4c4-4c22-8301-f4af3ed61303/cover/1783312597817-8-jpg-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/abd56927-c4c4-4c22-8301-f4af3ed61303/cover/1783312597817-8-jpg-removebg-preview.png', NULL, 'image/png', '62883', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "8.jpg-removebg-preview.png"}', '2026-07-06 04:36:39.814764+00'),
('c0154794-27ea-4461-b02a-3b95872cf98b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783343294538-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783343294538-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', NULL, 'image/jpeg', '86452', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "extension": "jpeg", "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM.jpeg", "safe_file_name": "whatsapp-image-2026-07-05-at-9-13-12-am.jpeg"}', '2026-07-06 13:08:15.817017+00'),
('75dba9df-ec34-4439-b6c5-b04e29a15b83', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783343453451-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783343453451-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', NULL, 'image/jpeg', '86452', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "extension": "jpeg", "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM.jpeg", "safe_file_name": "whatsapp-image-2026-07-05-at-9-13-12-am.jpeg"}', '2026-07-06 13:10:54.990519+00'),
('f3efa324-c9ab-408a-97fd-28a20b4af1e5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/abd56927-c4c4-4c22-8301-f4af3ed61303/model_3d/1783346112035-el-sismite.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/abd56927-c4c4-4c22-8301-f4af3ed61303/model_3d/1783346112035-el-sismite.glb', NULL, 'model/gltf-binary', '1956164', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "El sismite.glb"}', '2026-07-06 13:55:14.437338+00'),
('a58172e0-d29a-4532-88d0-eb22768d96c9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783346394270-8-jpg-removebg-preview.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783346394270-8-jpg-removebg-preview.png', NULL, 'image/png', '62883', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "extension": "png", "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "8.jpg-removebg-preview.png", "safe_file_name": "8-jpg-removebg-preview.png"}', '2026-07-06 13:59:54.97926+00'),
('d538bb21-446e-4a66-9cef-58ca70472442', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783346976702-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783346976702-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', NULL, 'image/jpeg', '86452', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM.jpeg"}', '2026-07-06 14:09:38.106675+00'),
('7dd3962f-2222-470f-91b2-8455114e13cb', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783347046424-whatsapp-image-2026-06-17-at-4-13-28-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783347046424-whatsapp-image-2026-06-17-at-4-13-28-pm.jpeg', NULL, 'image/jpeg', '14786', '{"kind": "editor_marker", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-06-17 at 4.13.28 PM.jpeg"}', '2026-07-06 14:10:48.115761+00'),
('ecd2bfc3-e2cc-4dc5-8669-c51c953c9b79', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/model_3d/1783347062742-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/model_3d/1783347062742-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-07-06 14:11:05.756174+00'),
('4264dbc3-5e2d-40c0-a6ed-303fc3cb4982', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783347133918-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783347133918-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "editor_marker", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-06 14:12:15.786033+00'),
('87e833e6-627c-4689-8541-2dbffb7d6fd6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783347320763-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783347320763-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-06 14:15:22.330524+00'),
('92bf14bc-78ea-4dad-928c-a2454f65f166', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/model_3d/1783347334322-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/model_3d/1783347334322-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-07-06 14:15:43.579352+00'),
('78fd255c-8c1e-4ddf-bae3-e39fc606d423', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783351449424-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783351449424-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg', NULL, 'image/jpeg', '86452', '{"kind": "editor_image", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-05 at 9.13.12 AM.jpeg"}', '2026-07-06 15:24:11.082201+00'),
('d30d1913-f2cc-49b1-8555-5fc592d26935', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783351535035-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783351535035-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "editor_marker", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-06 15:25:37.065341+00'),
('598ef6fe-b12f-492f-bf24-c66fd08eefde', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/45341e0c-7229-46c4-b797-dd8ceb4a5474/models/1783488218102-upb_real.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/45341e0c-7229-46c4-b797-dd8ceb4a5474/models/1783488218102-upb_real.glb', NULL, 'model/gltf-binary', '6057836', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "45341e0c-7229-46c4-b797-dd8ceb4a5474", "original_name": "upb_real.glb", "safe_file_name": "upb_real.glb"}', '2026-07-08 05:23:59.189378+00'),
('0cd4a6dd-109e-42d5-841a-bcca5e6f95ea', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/models/1783952236034-ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/models/1783952236034-ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', NULL, 'model/gltf-binary', '7982996', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303", "original_name": "ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb", "safe_file_name": "ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb"}', '2026-07-13 14:17:27.343721+00'),
('fc56fb26-6c01-4783-93eb-89e42180e841', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/cover/1783952492519-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/cover/1783952492519-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-13 14:21:34.464684+00'),
('d7ce1c05-8f41-41ad-9d37-d6946d7439ca', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/bf81e49f-3b51-4853-a43e-4e8cc5041be8/models/1783952478401-a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/legends/bf81e49f-3b51-4853-a43e-4e8cc5041be8/models/1783952478401-a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', NULL, 'model/gltf-binary', '6057836', '{"kind": "model_3d", "bucket": "legend-assets", "public": true, "extension": "glb", "legend_id": "bf81e49f-3b51-4853-a43e-4e8cc5041be8", "original_name": "a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb", "safe_file_name": "a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb"}', '2026-07-13 14:21:34.660036+00'),
('d6d000b2-215d-45b0-93f7-84d96a887772', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/source_document/1783998620580-la_serpiente_de_mar.pdf', NULL, 'application/pdf', '49789', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "La_Serpiente_de_Mar.pdf"}', '2026-07-14 03:10:21.748488+00'),
('f7e255aa-9208-4de5-80db-7a1653591d72', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/cover/1783998645503-captura-de-pantalla-2026-06-18-103715.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/cover/1783998645503-captura-de-pantalla-2026-06-18-103715.png', NULL, 'image/png', '213527', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "Captura de pantalla 2026-06-18 103715.png"}', '2026-07-14 03:10:47.579148+00'),
('6f9f610f-209b-424a-96de-8416300b5407', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/banner/1783998646286-banner_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/banner/1783998646286-banner_baymen.png', NULL, 'image/png', '317314', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "banner_baymen.png"}', '2026-07-14 03:10:50.037286+00'),
('03199f46-8e4a-4f31-b55f-bf8452b27daa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'cover', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/cover/1783998647332-captura-de-pantalla-2026-06-18-103715.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/cover/1783998647332-captura-de-pantalla-2026-06-18-103715.png', NULL, 'image/png', '213527', '{"kind": "cover", "bucket": "legend-assets", "public": true, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "Captura de pantalla 2026-06-18 103715.png"}', '2026-07-14 03:10:51.889611+00'),
('f950067b-023b-43a0-b725-793c8658cc30', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'banner', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/banner/1783998649403-banner_baymen.png', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/banner/1783998649403-banner_baymen.png', NULL, 'image/png', '317314', '{"kind": "banner", "bucket": "legend-assets", "public": true, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "banner_baymen.png"}', '2026-07-14 03:10:55.104561+00'),
('b73aa6cd-676d-4cae-922d-4e9e4e06eb45', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '52961', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:30.162524+00'),
('fc75e826-a47c-4e7d-beb6-336c7ce414aa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '20934', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:30.420492+00'),
('98e16986-2eae-4bf8-acf2-275f0dec5047', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '88559', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:30.746227+00'),
('bb86b6e9-b94d-4729-bee8-a38aec6c46d6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '75250', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:30.971965+00'),
('912dc3f5-650f-4747-b18a-aa3bb06306d4', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '73706', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:32.200125+00'),
('79ce8ebd-4e27-422b-8999-fc21107f7983', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-008.jpg', NULL, 'image/jpeg', '83370', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 8, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:32.804753+00'),
('7c73d932-8ed4-40cc-b482-8cf79fadd570', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '71223', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:31.196676+00'),
('9cc80f37-6f49-45a0-865b-4acaf3b2bff5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '77064', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:32.488495+00'),
('dc13efff-7c67-4a97-8488-57a372fca65d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-009.jpg', NULL, 'image/jpeg', '61161', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "version_id": null, "page_number": 9, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "fe3fd63c-e2f1-4545-bb18-32c47d37678f"}', '2026-07-14 03:11:33.026742+00'),
('d7ba134d-5359-4197-a23e-97b751ec77b9', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/model_3d/1784004267781-51b75da2-c565-4251-b6e9-345fa3db2355.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/model_3d/1784004267781-51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'model/gltf-binary', '7910288', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "51b75da2-c565-4251-b6e9-345fa3db2355.glb"}', '2026-07-14 04:44:53.50743+00'),
('9902d380-fdaa-424f-b350-80b382c595c6', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/marker_image/1784004305861-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/15b22816-585d-4d33-9270-eb7a280223e0/marker_image/1784004305861-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "editor_marker", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "15b22816-585d-4d33-9270-eb7a280223e0", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-14 04:45:07.140882+00'),
('87c7272e-02f0-4776-a1e8-cb9b53a4b30e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 'upload', NULL, '2f412137-0da6-4865-bf6d-dc121c54beb5/c9212d58-78d3-46a3-be78-575721fdd6c3/source_document/1784004758280-conisoft2026_bacalar_ar_digitalbooks.pdf', NULL, 'application/pdf', '998103', '{"kind": "source_document", "bucket": "legend-documents", "public": false, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "original_name": "CONISOFT2026_Bacalar_AR_DigitalBooks.pdf"}', '2026-07-14 04:52:40.532127+00'),
('6550455a-3fdb-4f8a-9a48-2c71f387cd7c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-001.jpg', NULL, 'image/jpeg', '307530', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 1, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:43.415156+00'),
('7340c7f0-721d-45ad-882e-bc6e77d8ace3', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-002.jpg', NULL, 'image/jpeg', '343098', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 2, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:43.722812+00'),
('96853941-9a49-4ff1-a337-be3fd08653fa', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-003.jpg', NULL, 'image/jpeg', '257468', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 3, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:44.27411+00'),
('426ab3c5-a814-4611-9ce5-106db937b78c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-004.jpg', NULL, 'image/jpeg', '235857', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 4, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:44.647489+00'),
('96fd7068-1a0a-4e21-8f86-651a64885bf5', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-005.jpg', NULL, 'image/jpeg', '256493', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 5, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:45.114981+00'),
('74656bf7-7ebb-40de-9452-90d98b2eab6b', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-006.jpg', NULL, 'image/jpeg', '268703', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 6, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:45.401159+00'),
('6362a998-b08f-449c-87c8-018857bd9a6c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-007.jpg', NULL, 'image/jpeg', '227629', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 7, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:46.309802+00'),
('dd63f267-1549-4970-9b9f-047bd9e8c224', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-008.jpg', NULL, 'image/jpeg', '342415', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 8, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:46.629604+00'),
('9302e024-5e39-4709-aa8c-9f2d94d0b8da', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'illustration', 'upload', NULL, 'legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-009.jpg', NULL, 'image/jpeg', '90563', '{"kind": "rendered_pdf_page", "width": 918, "bucket": "legend-documents", "height": 1188, "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "version_id": null, "page_number": 9, "render_scale": 1.5, "render_format": "jpg", "source_document_id": "b5dd93f6-2663-42e0-9de6-dae298e8f79a"}', '2026-07-14 04:52:46.880645+00'),
('0307397f-7596-476e-8724-6a3ab311098e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'marker_image', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/c9212d58-78d3-46a3-be78-575721fdd6c3/marker_image/1784059334215-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', '2f412137-0da6-4865-bf6d-dc121c54beb5/c9212d58-78d3-46a3-be78-575721fdd6c3/marker_image/1784059334215-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg', NULL, 'image/jpeg', '45092', '{"kind": "editor_marker", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "original_name": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg"}', '2026-07-14 20:02:15.948574+00'),
('038c5499-1229-406e-a8cc-27858867a01f', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'model_3d', 'upload', 'https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/c9212d58-78d3-46a3-be78-575721fdd6c3/model_3d/1784059373595-a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', '2f412137-0da6-4865-bf6d-dc121c54beb5/c9212d58-78d3-46a3-be78-575721fdd6c3/model_3d/1784059373595-a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', NULL, 'model/gltf-binary', '6057836', '{"kind": "editor_model_3d", "bucket": "legend-assets", "public": true, "context": "manual_editor", "legend_id": "c9212d58-78d3-46a3-be78-575721fdd6c3", "original_name": "a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb"}', '2026-07-14 20:03:03.449328+00')
on conflict do nothing;

-- ========== orders ==========
INSERT INTO public.orders (id, user_id, status, total_amount, currency, checkout_snapshot, notes, created_at, updated_at) VALUES ('1cf5c5f3-6a87-42ea-abbb-6f593bdd25ef', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'approved', '49.00', 'MXN', '{"item": "Plan Cultural Mensual", "brand": "mastercard", "simulated": true, "cardholder": "juan antonio huh puc", "created_via": "reader_checkout"}', 'Suscripción simulada procesada correctamente.', '2026-07-09 15:16:03.191491+00', '2026-07-09 15:16:03.191491+00'),
('00a308ea-4ba0-4529-a647-f54e3bd2926c', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'approved', '59.00', 'MXN', '{"item": "El cura sin cabeza - Digital", "brand": "mastercard", "simulated": true, "cardholder": "juan antonio huh puc", "created_via": "reader_checkout"}', 'Compra simulada procesada correctamente.', '2026-07-10 01:25:04.045976+00', '2026-07-10 01:25:04.045976+00'),
('faae01d4-8506-4070-9e16-e53b1ac92bad', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'approved', '49.00', 'MXN', '{"item": "Plan Cultural Mensual", "brand": "mastercard", "simulated": true, "cardholder": "juan antonio huh puc", "created_via": "reader_checkout"}', 'Suscripción simulada procesada correctamente.', '2026-07-10 02:07:09.324263+00', '2026-07-10 02:07:09.324263+00'),
('eb24c600-1fe2-453d-bf44-0ad16f408c58', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'approved', '49.00', 'MXN', '{"item": "Plan Cultural Mensual", "brand": "mastercard", "simulated": true, "cardholder": "Juan Antonio Huh Puc", "created_via": "reader_checkout"}', 'Suscripción simulada procesada correctamente.', '2026-07-13 14:24:38.724489+00', '2026-07-13 14:24:38.724489+00')
on conflict do nothing;

-- ========== admin_audit_logs ==========
INSERT INTO public.admin_audit_logs (id, admin_id, action, entity_type, entity_id, severity, details, ip_address, user_agent, created_at) VALUES ('4ae489dc-8821-49e9-b0ce-cbfa9a5e6e93', NULL, 'approve_creator', 'creator_application', '0ed21f16-ac24-482a-b9c3-8dcbe21485b2', 'info', '{"pen_name": "Autor Demo Bacalar", "approved_user_id": "9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2"}', NULL, NULL, '2026-05-24 23:48:32.759697+00'),
('74b556a5-34ec-4596-8fe3-f6a3c880f15b', NULL, 'approve_legend', 'content_review', 'a7b8064d-b6c4-48e2-b714-09ccc063bf42', 'info', '{"feedback": "Contenido aprobado para publicación.", "legend_version_id": "6cb5ab8d-ff6f-4090-a00d-58741a597ecc"}', NULL, NULL, '2026-05-25 01:41:00.44098+00'),
('e5c5e803-1707-407e-8d06-97fecafbec8c', NULL, 'publish_legend', 'legend_version', '6cb5ab8d-ff6f-4090-a00d-58741a597ecc', 'info', '{"legend_id": "8b3a3ab9-cc87-4847-8eec-b1e65cf6b772"}', NULL, NULL, '2026-05-25 01:48:57.038592+00'),
('ce51af34-fe07-4196-b7f4-7dd3b439b0e7', NULL, 'generate_codes', 'code_batch', '2f4ddccf-37ca-4021-8132-fe06e744cb43', 'info', '{"prefix": "CURA", "quantity": 5, "edition_id": "4b33cb7f-7313-43ca-b54e-0e5802afe19c", "code_request_id": null}', NULL, NULL, '2026-05-25 02:17:34.842557+00'),
('fd76a24e-45be-494c-89a5-af70ff93135d', NULL, 'approve_creator', 'creator_application', 'eceed4fa-f143-43c0-a53d-988a001ac0e9', 'info', '{"pen_name": "Autor Leyendas Bacalar", "approved_user_id": "2f412137-0da6-4865-bf6d-dc121c54beb5"}', NULL, NULL, '2026-05-26 05:31:42.901837+00'),
('c9a7d7ea-d941-43ba-b0a3-edab38347427', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approve_creator', 'creator_application', '5bd3fdbb-69e8-457a-8d11-5961528e160d', 'info', '{"pen_name": "Crimildo Alexander Tuyub Antonio", "approved_user_id": "1dab12f6-df97-4305-9d87-bb2618b93ae0"}', NULL, NULL, '2026-05-27 05:04:49.627539+00'),
('95f757b5-4bfa-4b40-a20b-11d7c062886e', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'reject_creator', 'creator_application', 'b41929f0-bf22-485c-ab66-0981dd0137d7', 'info', '{"feedback": "ed", "rejected_user_id": "4325bf1e-cbfc-4bb0-9d66-095dc0653171"}', NULL, NULL, '2026-05-31 18:42:14.795924+00'),
('614eb4d7-e0ad-45d9-a013-64c721113d26', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'reject_legend', 'content_review', 'eb9ca53b-0eb5-4bde-b0f6-177621265a4e', 'warning', '{"feedback": "", "legend_version_id": "c8fe78fb-d19f-4f8d-a1ae-941c1bdaf1ea"}', NULL, NULL, '2026-06-04 01:49:45.35441+00'),
('fab09c6b-d327-42b3-89a4-8e2955db6c66', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'request_legend_changes', 'content_review', '4af4d376-bb85-4804-987d-8110b4df8271', 'info', '{"feedback": "agrega cambios sub una foto de portaa", "legend_version_id": "1c15ba56-af90-4b8e-9657-e9d8c6df916b"}', NULL, NULL, '2026-06-04 15:29:55.571204+00'),
('c0f0e594-8c88-4a6d-b3f5-3aae91eb4028', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approve_legend', 'content_review', '9753fb13-e13d-406d-b19c-fd585eab7306', 'info', '{"feedback": "pefecto", "legend_version_id": "249bd130-7e8f-48b6-aa95-03e1f439ae25"}', NULL, NULL, '2026-06-12 17:35:11.479967+00'),
('ec7a9582-7eac-4c61-aa74-b3170fb227db', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approve_legend', 'content_review', 'ccb7d8ce-6e83-4dd5-be89-e1044de5a452', 'info', '{"feedback": null, "legend_version_id": "d2942c6e-fd36-4882-bc8e-e3e87e888c17"}', NULL, NULL, '2026-06-12 17:35:15.418793+00'),
('1e263773-e03e-4226-a82a-e01a1365523b', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'publish_legend', 'legend_version', '249bd130-7e8f-48b6-aa95-03e1f439ae25', 'info', '{"legend_id": "ea8e9c28-e0c7-416c-8a23-0819ba9897d1"}', NULL, NULL, '2026-06-12 17:35:24.22752+00'),
('35af1c29-49ae-459a-876d-46830b326e97', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'publish_legend', 'legend_version', 'd2942c6e-fd36-4882-bc8e-e3e87e888c17', 'info', '{"legend_id": "6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd"}', NULL, NULL, '2026-06-12 17:35:26.87531+00'),
('9ade2a86-3fc9-4c78-984a-73a1439d68aa', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'generate_codes', 'code_batch', '09472751-8232-4ed8-913b-55f0f9e4dc74', 'info', '{"prefix": "PRINCI", "quantity": 2, "edition_id": "a3e0f6ac-d151-40aa-91aa-39229c185fc3", "code_request_id": null}', NULL, NULL, '2026-07-12 00:30:07.251693+00'),
('e122a8bb-4f53-4e3f-a7dd-fd80fdaf339a', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'generate_codes', 'code_batch', '0c9e1a15-8860-4728-8e78-6193e8c58cf5', 'info', '{"prefix": "BRUJA", "quantity": 1, "edition_id": "a3e0f6ac-d151-40aa-91aa-39229c185fc3", "code_request_id": null}', NULL, NULL, '2026-07-12 20:12:37.160586+00'),
('f6d280fd-8bc0-48b1-9ac2-b54d29186487', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approve_legend', 'content_review', 'b4102695-5046-465d-b33d-9986c5b44f80', 'info', '{"feedback": "Perfecto", "legend_version_id": "8b9fb982-967d-403b-ac35-6985f6e0d8c9"}', NULL, NULL, '2026-07-13 14:18:23.504938+00'),
('ed75d281-e91e-4376-b0d8-59a4a0933608', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'publish_legend', 'legend_version', '8b9fb982-967d-403b-ac35-6985f6e0d8c9', 'info', '{"legend_id": "abd56927-c4c4-4c22-8301-f4af3ed61303"}', NULL, NULL, '2026-07-13 14:18:29.735022+00')
on conflict do nothing;

-- ========== creator_profiles ==========
INSERT INTO public.creator_profiles (user_id, pen_name, biography, profile_status, created_at, updated_at, cover_asset_id, headline, location_label, website_url, profile_visibility) VALUES ('9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', 'Autor Demo Bacalar', NULL, 'active', '2026-05-24 23:48:32.759697+00', '2026-05-24 23:48:32.759697+00', NULL, NULL, NULL, NULL, 'public'),
('1dab12f6-df97-4305-9d87-bb2618b93ae0', 'Crimildo Alexander Tuyub Antonio', NULL, 'active', '2026-05-27 05:04:49.627539+00', '2026-05-27 05:04:49.627539+00', NULL, NULL, NULL, NULL, 'public'),
('2f412137-0da6-4865-bf6d-dc121c54beb5', 'Juan antonio Huh puc', 'Animo la vida sigue ', 'active', '2026-05-26 05:31:42.901837+00', '2026-07-06 01:48:57.309223+00', '3a1a4549-b83d-480e-a72d-b8df975da31f', 'Mi vida eres tu', 'MEXICO', '', 'public')
on conflict do nothing;

-- ========== cover_templates ==========
INSERT INTO public.cover_templates (id, name, scope, owner_id, config, background_asset_id, preview_asset_id, is_active, created_at, updated_at) VALUES ('4678c2e3-03e6-46d9-b5cf-4e618539b94a', 'Clásica', 'system', NULL, '{"font": "serif", "align": "center", "preset": "classic", "palette": ["#1e3a5f", "#f5efe0"]}', NULL, NULL, true, '2026-07-05 04:39:53.933373+00', '2026-07-05 04:39:53.933373+00'),
('cc2db1ce-f36e-4637-9001-bca59a2b72ed', 'Moderna', 'system', NULL, '{"font": "sans", "align": "left", "preset": "modern", "palette": ["#0f766e", "#ecfeff"]}', NULL, NULL, true, '2026-07-05 04:39:53.933373+00', '2026-07-05 04:39:53.933373+00'),
('844c1a6c-c51c-4177-85d4-75ab3a57b6b6', 'Minimal', 'system', NULL, '{"font": "sans", "align": "center", "preset": "minimal", "palette": ["#111827", "#ffffff"]}', NULL, NULL, true, '2026-07-05 04:39:53.933373+00', '2026-07-05 04:39:53.933373+00'),
('0dff8a19-b062-4c3e-af5b-2dd01868a417', 'En blanco', 'system', NULL, '{"font": "sans", "align": "center", "preset": "blank", "palette": ["#ffffff", "#111827"]}', NULL, NULL, true, '2026-07-05 04:39:53.933373+00', '2026-07-05 04:39:53.933373+00')
on conflict do nothing;

-- ========== payments ==========
INSERT INTO public.payments (id, order_id, provider, status, amount, currency, payment_method, card_last_four, transaction_reference, metadata, created_at) VALUES ('35863fca-fd3d-43c0-bef6-2d664fb095ed', '1cf5c5f3-6a87-42ea-abbb-6f593bdd25ef', 'simulated', 'approved', '49.00', 'MXN', 'simulated_card', '3126', 'SIM-SUB-1cf5c5f36a8742eaabbb6f593bdd25ef', '{"message": "Suscripción simulada aprobada. No se procesó dinero real.", "simulated": true, "subscription_plan_id": "548ac229-2484-405b-a800-f1099c5dd17b"}', '2026-07-09 15:16:03.191491+00'),
('c1580143-ec66-40df-8d3b-4644279f4898', '00a308ea-4ba0-4529-a647-f54e3bd2926c', 'simulated', 'approved', '59.00', 'MXN', 'simulated_card', '3126', 'SIM-00a308ea4ba04529a647f54e3bd2926c', '{"message": "Pago simulado aprobado. No se procesó dinero real.", "simulated": true}', '2026-07-10 01:25:04.045976+00'),
('9bf34ba9-8b19-4d96-88cb-dff971136fb1', 'faae01d4-8506-4070-9e16-e53b1ac92bad', 'simulated', 'approved', '49.00', 'MXN', 'simulated_card', '3126', 'SIM-SUB-faae01d4850640709e16e53b1ac92bad', '{"message": "Suscripción simulada aprobada. No se procesó dinero real.", "simulated": true, "subscription_plan_id": "548ac229-2484-405b-a800-f1099c5dd17b"}', '2026-07-10 02:07:09.324263+00'),
('13429f98-ec57-482e-907e-5878428de969', 'eb24c600-1fe2-453d-bf44-0ad16f408c58', 'simulated', 'approved', '49.00', 'MXN', 'simulated_card', '1019', 'SIM-SUB-eb24c6001fe2453dbf440ad16f408c58', '{"message": "Suscripción simulada aprobada. No se procesó dinero real.", "simulated": true, "subscription_plan_id": "548ac229-2484-405b-a800-f1099c5dd17b"}', '2026-07-13 14:24:38.724489+00')
on conflict do nothing;

-- ========== legends ==========
INSERT INTO public.legends (id, creator_id, title, slug, synopsis, short_synopsis, origin_place, language, age_rating, status, access_type, is_featured, created_at, updated_at, published_at, creation_mode, cover_template_id, cover_data, back_cover_data) VALUES ('8b3a3ab9-cc87-4847-8eec-b1e65cf6b772', '9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', 'El cura sin cabeza', 'el-cura-sin-cabeza', 'Una leyenda de Bacalar sobre una aparición misteriosa que recorre los caminos antiguos.', 'Una aparición sin cabeza acecha los caminos de Bacalar.', 'Bacalar, Quintana Roo', 'es', 'B', 'archived', 'mixed', 'f', '2026-05-24 23:55:13.875864+00', '2026-06-07 00:34:44.323592+00', '2026-05-25 01:48:57.038592+00', 'manual', NULL, '{}', '{}'),
('6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'La bruja', 'la-bruja', 'La bruja y sus cosas raras de bacalar ¿', 'La bruja y sus cosas raras de bacalar ¿', 'Bacalar, Quintana Roo', 'español', 'general', 'published', 'free', 'f', '2026-06-08 14:42:43.971214+00', '2026-06-12 17:35:26.87531+00', '2026-06-12 17:35:26.87531+00', 'manual', NULL, '{}', '{}'),
('bf81e49f-3b51-4853-a43e-4e8cc5041be8', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'El principito', 'el-principito', 'Un Principe, que vivia en el espacio en una pequeña luna', 'Un Principe, que vivia en el espacio en una pequeña luna', 'Bacalar, Quintana Roo', 'es', 'general', 'in_review', 'code_required', 'f', '2026-07-06 14:08:42.985762+00', '2026-07-13 14:21:54.869483+00', NULL, 'manual', 'classic', '{"theme": {"bg": "#1e3a5f", "fg": "#f6efdd", "font": "serif", "accent": "#c9a24b"}, "content": {"title": "El principito ", "author": "Juan antonio Huh puc", "imageUrl": "", "subtitle": ""}}', '{"theme": {"bg": "#1e3a5f", "fg": "#f6efdd", "font": "serif", "accent": "#c9a24b"}, "content": {"bio": "", "isbn": "", "qrUrl": "/legend/el-principito/read", "author": "Juan antonio Huh puc", "credits": "", "sinopsis": "Un Principe, que vivia en el espacio en una pequeña luna"}}'),
('abd56927-c4c4-4c22-8301-f4af3ed61303', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'EL AMANECER', 'el-amanecer', 'sdsdsdsdsdsdsdsdsdsdsdsdsdsdsds', 'sdsdsdsdsdsdsdsdsdsdsdsdsdsdsds', 'Bacalar, Quintana Roo', 'es', 'general', 'published', 'code_required', 'f', '2026-07-06 01:54:01.853919+00', '2026-07-13 14:18:29.735022+00', '2026-07-13 14:18:29.735022+00', 'manual', 'fantasy', '{"theme": {"bg": "#2e1065", "fg": "#ede9fe", "font": "display", "accent": "#f0abfc"}, "layout": {}, "content": {"title": "EL AMANECER", "author": "Juan antonio huh puc ", "imageUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/abd56927-c4c4-4c22-8301-f4af3ed61303/editor/1783343453451-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg", "subtitle": "de esta pendeja"}}', '{"theme": {"bg": "#2e1065", "fg": "#ede9fe", "font": "sans", "accent": "#f0abfc"}, "layout": {}, "content": {"bio": "", "isbn": "", "qrUrl": "/legend/el-amanecer/read", "author": "", "credits": "", "sinopsis": ""}}'),
('74d2e940-2fd4-45ad-9698-a273058569ac', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'La bruja', 'la-bruja-2', 'cvcvbcvbcvbcvbcvbcvbcvbcvbcvbcvcvbcvb', 'cvcvbcvbcvbcvbcvbcvbcvbcvbcvbcvcvbcvb', 'Bacalar, Quintana Roo', 'es', 'general', 'draft', 'free', 'f', '2026-06-19 06:48:28.217647+00', '2026-06-19 06:48:28.217647+00', NULL, 'manual', NULL, '{}', '{}'),
('ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'La serpiente del mar', 'la-serpiente-del-mar', 'Una niña pesca en la laguna cuando unos hombres le advierten sobre un enorme animal. Ella asustada corre a avisarle a los soldados. Estos descubren y matan a una hermosa serpiente marina de cuatro metros que estaba desarrollando unas alas.', 'Una niña pesca en la laguna cuando unos hombres le advierten sobre un enorme animal. Ella asustada corre a avisarle a los soldados. Estos descubren y matan a una hermosa serpiente marina de cuatro metros que estaba desar...', 'Bacalar, Quintana Roo', 'español', 'general', 'published', 'free', 'f', '2026-06-12 17:21:18.443785+00', '2026-06-19 06:55:08.797405+00', '2026-06-12 17:35:24.22752+00', 'source_document', NULL, '{}', '{}'),
('ddf1014f-1b3b-4d5c-aa24-bc22001f3670', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'fssdfgsgsgs', 'fssdfgsgsgs', 'gsdgsdgsdgsdgsdgsdgsdgsdgsdgsgs', 'gsdgsdgsdgsdgsdgsdgsdgsdgsdgsgs', 'Bacalar, Quintana Roo', 'es', 'general', 'draft', 'free', 'f', '2026-06-29 14:21:26.506344+00', '2026-06-29 14:21:32.929863+00', NULL, 'source_document', NULL, '{}', '{}'),
('45341e0c-7229-46c4-b797-dd8ceb4a5474', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'la laguna viva', 'la-laguna-viva', 'gfhgfhgfhgfhgfhfghfghfhfghfghfgh', 'gfhgfhgfhgfhgfhfghfghfhfghfghfgh', 'Bacalar, Quintana Roo', 'es', 'general', 'in_review', 'free', 'f', '2026-06-22 15:29:37.373849+00', '2026-07-08 05:24:19.09877+00', NULL, 'manual', NULL, '{}', '{}'),
('15b22816-585d-4d33-9270-eb7a280223e0', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'La serpiente del mar 2', 'la-serpiente-del-mar-2', 'tytryrtyrtytryrttytrytryrtytryty', 'tytryrtyrtytryrttytrytryrtytryty', 'Bacalar, Quintana Roo', 'es', 'general', 'in_review', 'free', 'f', '2026-07-14 03:10:19.845415+00', '2026-07-14 04:47:11.643609+00', NULL, 'source_document', NULL, '{}', '{}'),
('c9212d58-78d3-46a3-be78-575721fdd6c3', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'conasift', 'conasift', 'ewewewewewewewewewewwweweewewew', 'ewewewewewewewewewewwweweewewew', 'Bacalar, Quintana Roo', 'es', 'general', 'draft', 'free', 'f', '2026-07-14 04:52:37.780926+00', '2026-07-14 20:13:32.134094+00', NULL, 'source_document', NULL, '{}', '{}')
on conflict do nothing;

-- ========== legend_versions ==========
INSERT INTO public.legend_versions (id, legend_id, version_number, status, created_by, reviewed_by, review_notes, created_at, submitted_at, published_at) VALUES ('8b9fb982-967d-403b-ac35-6985f6e0d8c9', 'abd56927-c4c4-4c22-8301-f4af3ed61303', '1', 'published', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'Perfecto', '2026-07-06 01:54:02.238165+00', '2026-07-13 14:17:52.870472+00', '2026-07-13 14:18:29.735022+00'),
('6cb5ab8d-ff6f-4090-a00d-58741a597ecc', '8b3a3ab9-cc87-4847-8eec-b1e65cf6b772', '1', 'published', '9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', NULL, 'Contenido aprobado para publicación.', '2026-05-25 01:19:38.941858+00', '2026-05-25 01:24:49.539612+00', '2026-05-25 01:48:57.038592+00'),
('a3555aa0-5a63-40c2-9fc1-a059855639c6', 'bf81e49f-3b51-4853-a43e-4e8cc5041be8', '1', 'submitted', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-07-06 14:08:43.43403+00', '2026-07-13 14:21:54.869483+00', NULL),
('2ec7ea42-c41b-4ca8-ae28-a8df9916d2d9', '15b22816-585d-4d33-9270-eb7a280223e0', '1', 'submitted', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-07-14 03:10:19.911432+00', '2026-07-14 04:47:11.643609+00', NULL),
('fb4df5f8-eb0e-47ab-b5c2-36baa74933a1', 'c9212d58-78d3-46a3-be78-575721fdd6c3', '1', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-07-14 04:52:37.839758+00', NULL, NULL),
('249bd130-7e8f-48b6-aa95-03e1f439ae25', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '1', 'published', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'pefecto', '2026-06-12 17:21:20.228086+00', '2026-06-12 17:34:31.410396+00', '2026-06-12 17:35:24.22752+00'),
('d2942c6e-fd36-4882-bc8e-e3e87e888c17', '6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', '1', 'published', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', NULL, '2026-06-08 14:42:44.414089+00', '2026-06-08 14:45:32.994166+00', '2026-06-12 17:35:26.87531+00'),
('d3dd44a3-eef1-4565-809d-1252a5a63b72', '74d2e940-2fd4-45ad-9698-a273058569ac', '1', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-06-19 06:48:28.560694+00', NULL, NULL),
('a46f3ff4-2ce1-40e5-82bd-3725528209c8', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', '1', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-06-29 14:21:27.058043+00', NULL, NULL),
('e49e950b-84e4-442d-9963-7746a50db77d', '45341e0c-7229-46c4-b797-dd8ceb4a5474', '1', 'submitted', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-06-22 15:29:37.766828+00', '2026-07-08 05:24:19.09877+00', NULL)
on conflict do nothing;

-- ========== legend_genres ==========
INSERT INTO public.legend_genres (legend_id, genre_id, created_at) VALUES ('6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', 'ec4a523e-8204-47a0-87a8-80da11d0b415', '2026-06-08 14:45:32.636811+00'),
('ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '85ed6543-2e72-4e51-bb68-b71609af716f', '2026-06-12 17:34:30.922554+00'),
('abd56927-c4c4-4c22-8301-f4af3ed61303', 'd3b13ffb-0bfb-4a5d-b3ec-560b81069987', '2026-07-13 14:17:51.868772+00'),
('abd56927-c4c4-4c22-8301-f4af3ed61303', '26b647e9-8f32-4713-88db-c7d707670e09', '2026-07-13 14:17:51.868772+00'),
('abd56927-c4c4-4c22-8301-f4af3ed61303', '8ab63297-8ee2-4e1c-9edf-8a4e6d890262', '2026-07-13 14:17:51.868772+00'),
('abd56927-c4c4-4c22-8301-f4af3ed61303', '521101f9-b4ca-444f-9c8e-cca1122a50a8', '2026-07-13 14:17:51.868772+00'),
('bf81e49f-3b51-4853-a43e-4e8cc5041be8', '8ab63297-8ee2-4e1c-9edf-8a4e6d890262', '2026-07-13 14:21:53.937899+00'),
('bf81e49f-3b51-4853-a43e-4e8cc5041be8', '521101f9-b4ca-444f-9c8e-cca1122a50a8', '2026-07-13 14:21:53.937899+00'),
('15b22816-585d-4d33-9270-eb7a280223e0', '5ccec8c6-ea5d-4063-bd9f-2a992a6c6419', '2026-07-14 04:47:10.834581+00'),
('15b22816-585d-4d33-9270-eb7a280223e0', '1d0dab0f-dcf6-4a9e-be40-09cf98e832a0', '2026-07-14 04:47:10.834581+00'),
('15b22816-585d-4d33-9270-eb7a280223e0', '742f17f6-e415-47b2-b636-1ec87fe42825', '2026-07-14 04:47:10.834581+00')
on conflict do nothing;

-- ========== legend_media ==========
INSERT INTO public.legend_media (id, legend_id, asset_id, media_type, usage_context, is_primary, created_at) VALUES ('5d651e54-ec3f-4421-83d5-3688cbe4eb85', '6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', '30e84f9f-9b7f-4366-9234-8682d2dcd94a', 'cover', 'catalog', 't', '2026-06-08 14:43:23.890742+00'),
('5d729dec-922c-45c1-817c-596764cdbccf', '6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', 'a06a4403-2893-4d54-94b3-d10b4f9e103e', 'banner', 'detail', 't', '2026-06-08 14:43:48.43041+00'),
('c40b4ec4-40ee-4021-8a36-a3c9229b3dca', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', 'e415ae03-079b-4f62-b743-0fb3957902c6', 'cover', 'catalog', 't', '2026-06-12 17:22:29.065146+00'),
('2428ab93-e395-4279-ad9c-cd25651db880', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '7246428f-ffce-4928-8b29-a169162360ff', 'banner', 'detail', 't', '2026-06-12 17:28:14.728721+00'),
('b99f8f4c-847b-4fcf-8286-d8ebaf9e5140', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'a4665253-0659-4850-ac74-304b61bc4043', 'cover', 'catalog', 't', '2026-07-06 04:36:40.001349+00'),
('170491ad-4beb-43b8-bf6b-35d7c2785b7d', 'bf81e49f-3b51-4853-a43e-4e8cc5041be8', 'fc56fb26-6c01-4783-93eb-89e42180e841', 'cover', 'catalog', 't', '2026-07-13 14:21:34.983228+00'),
('e635f113-cd26-4a43-9d20-3ec22c65fb08', '15b22816-585d-4d33-9270-eb7a280223e0', '03199f46-8e4a-4f31-b55f-bf8452b27daa', 'cover', 'catalog', 't', '2026-07-14 03:10:47.669893+00'),
('4d3d21c9-02ae-4ceb-8916-b030aa2a3969', '15b22816-585d-4d33-9270-eb7a280223e0', 'f950067b-023b-43a0-b725-793c8658cc30', 'banner', 'detail', 't', '2026-07-14 03:10:50.116401+00')
on conflict do nothing;

-- ========== physical_editions ==========
INSERT INTO public.physical_editions (id, legend_id, edition_name, edition_number, isbn, release_year, status, created_by, created_at, updated_at, code_quota) VALUES ('4b33cb7f-7313-43ca-b54e-0e5802afe19c', '8b3a3ab9-cc87-4847-8eec-b1e65cf6b772', 'Primera edición física 2026', '1', NULL, '2026', 'active', NULL, '2026-05-25 01:51:50.868615+00', '2026-05-26 03:52:27.333694+00', '0'),
('6d9b1596-21c1-407f-9ab5-9284b255c724', '74d2e940-2fd4-45ad-9698-a273058569ac', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-10 04:11:43.366108+00', '2026-07-10 04:11:43.366108+00', '0'),
('a3e0f6ac-d151-40aa-91aa-39229c185fc3', '6aaf3a39-ddf2-4ffd-bb42-b3177dacf5fd', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-10 04:11:43.366108+00', '2026-07-10 05:02:31.455504+00', '0'),
('4bf571a4-53e4-4619-9007-312f6e92dfe0', 'bf81e49f-3b51-4853-a43e-4e8cc5041be8', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-12 00:03:25.114863+00', '2026-07-12 00:03:25.114863+00', '0'),
('3ee7e285-1730-472b-82c7-089bce8ed561', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-10 04:11:43.366108+00', '2026-07-12 21:11:46.184142+00', '100'),
('96828334-9efe-4f97-a0bb-8bf38ddd3a44', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-10 04:11:43.366108+00', '2026-07-12 21:11:55.703954+00', '100'),
('a66d7f5b-13e3-437e-947d-54b703351e36', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'Edicion fisica', NULL, NULL, NULL, 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-12 21:54:38.875158+00', '2026-07-12 21:54:38.875158+00', '0')
on conflict do nothing;

-- ========== user_legend_access ==========
INSERT INTO public.user_legend_access (id, user_id, legend_id, access_source, source_id, status, starts_at, expires_at, created_at, updated_at) VALUES ('e7209c03-7158-46f4-8609-e38bd95b1bb8', '2f412137-0da6-4865-bf6d-dc121c54beb5', '8b3a3ab9-cc87-4847-8eec-b1e65cf6b772', 'digital_purchase', '00a308ea-4ba0-4529-a647-f54e3bd2926c', 'active', '2026-07-10 01:25:04.045976+00', NULL, '2026-07-10 01:25:04.045976+00', '2026-07-10 01:25:04.045976+00'),
('bcf7e0ab-46e5-401a-b970-e3d3a13693a8', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'code', '5a043709-a4c5-420d-b347-936706f314ff', 'active', '2026-07-13 14:14:58.659915+00', NULL, '2026-07-13 14:14:58.659915+00', '2026-07-13 14:14:58.659915+00'),
('fd647441-82da-48db-8603-0109561e4eb7', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'code', '1e0a74a7-8a5d-4fcb-83de-ace419c42a7a', 'active', '2026-07-13 14:23:25.434529+00', NULL, '2026-07-13 14:23:25.434529+00', '2026-07-13 14:23:25.434529+00')
on conflict do nothing;

-- ========== shelf_items ==========
INSERT INTO public.shelf_items (user_id, legend_id, created_at) VALUES ('ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '2026-07-09 16:19:23.852381+00')
on conflict do nothing;

-- ========== legend_source_documents ==========
INSERT INTO public.legend_source_documents (id, legend_id, version_id, asset_id, uploaded_by, document_type, is_primary_source, extraction_status, page_count, created_at, render_status, rendered_page_count, rendered_at, render_error) VALUES ('fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, 'd6d000b2-215d-45b0-93f7-84d96a887772', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 't', 'pending', '9', '2026-07-14 03:10:22.1603+00', 'ready', '9', '2026-07-14 03:11:33.082+00', NULL),
('b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '87c7272e-02f0-4776-a1e8-cb9b53a4b30e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 't', 'extracted', '9', '2026-07-14 04:52:41.083138+00', 'ready', '9', '2026-07-14 04:52:46.938+00', NULL),
('57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, 'ae5bc837-af47-4f1f-955c-12d23d31219e', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 't', 'extracted', '8', '2026-06-12 17:21:31.729757+00', 'ready', '8', '2026-06-12 22:19:19.58+00', NULL),
('60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, 'deb9adaf-0f93-48b2-9b9d-1755207d2000', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'pdf', 't', 'pending', '32', '2026-06-29 14:21:31.868424+00', 'ready', '32', '2026-06-29 14:22:06.318+00', NULL)
on conflict do nothing;

-- ========== legend_pages ==========
INSERT INTO public.legend_pages (id, version_id, page_number, title, text_content, background_asset_id, created_at, updated_at, editor_data, rendered_html, content_format, editor_version, editor_stats) VALUES ('61f6d26b-2400-4c5e-bb26-39e593acf397', '6cb5ab8d-ff6f-4090-a00d-58741a597ecc', '1', 'La aparición', 'Cuenta la leyenda que, en ciertas noches, una figura sin cabeza aparece cerca de los caminos antiguos de Bacalar.', NULL, '2026-05-25 01:22:11.746404+00', '2026-05-25 01:22:11.746404+00', NULL, NULL, 'plain', NULL, '{}'),
('76c9004d-ecc8-4c19-836b-7fb0935fda06', '249bd130-7e8f-48b6-aa95-03e1f439ae25', '1', 'Pagina 1', 'La Serpiente de Mar
Tradición oral de la costa

-- 1 of 8 --

-- 2 of 8 --

La Serpiente de Mar
CAPÍTULO I
La niña de la laguna
Cuando yo era pequeña vivía con mi abuelita a la orilla de la laguna, en una casita de madera
que olía a sal y a leña. Cada mañana me despertaba el canto de los pájaros y el golpeteo del
agua contra los palos del muelle.
Lo que más me gustaba era ir a pescar al puente. Atrapaba pescaditos con un poco de
nixtamal y, cuando nadie me veía, me tiraba clavados al agua tibia.
—¡Abuelita! ¿Ya es hora de lavar el nixtamal? —le gritaba.
—Sí, hija —contestaba ella.
Pero la verdad, lavar nixtamal no me gustaba nada. Yo soñaba con pescar peces grandes y
bonitos, y hasta langostas… aunque casi siempre solo caían sardinas.

-- 3 of 8 --

La Serpiente de Mar
CAPÍTULO II
Los hombres del cayuco
Una tarde calurosa estaba sentada en el puente, dándoles de comer a los pescaditos, cuando
se acercó un cayuco con unos señores.
—¿Qué haces, nena? —me preguntó uno, sonriendo.
—Aquí, criando pescaditos —respondí muy orgullosa.
Los señores se rieron y siguieron remando despacito por la orilla, perdiéndose entre los
manglares verdes. Yo me quedé jugando con el agua, sin imaginar que esa tarde no sería
como las demás.
4
El aviso
No pasó mucho rato cuando uno de los señores regresó remando con todas sus fuerzas.
Venía pálido y gritaba:
—¡Anda, niña! ¡Avísale a los soldados que hay un animal bien grandote!
—¿No será que me quieren quitar mis pescaditos? —pensé desconfiada.
—¡Claro que no! Es un animal enorme… ¡y a lo mejor hasta te come! —me advirtió.
Sentí un escalofrío. Solté mi cubo, mi anzuelo y mi nixtamal, y salí corriendo hacia mi casa tan
rápido como pude.

-- 4 of 8 --

La Serpiente de Mar
CAPÍTULO III
5
La abuelita no me creía
Llegué temblando y muy pálida.
—¿Qué tienes, hija? —preguntó mi abuelita.
—¡Un señor dice que hay un monstruo en la laguna y que llame a los soldados!
—Estás loca —se rió ella—. De seguro solo te andaban espantando.
Pero yo sabía lo que había oído. Así que fui yo solita a buscar a los soldados y, de regreso, me
llevé a mi abuelita casi a rastras hasta la orilla. El viento soplaba raro entre los manglares, y
nadie se atrevía a hablar fuerte.
6
La serpiente del monte
Cuando llegamos, los soldados avanzaron apuntando hacia el monte. Y entonces la vimos.
Era enorme. Estaba enrollada entre los arbustos, y sus escamas brillaban con colores verdes,
azules y negros. Su cabeza parecía la de un cocodrilo, pero mucho más larga; sus colmillos
eran grandes y feos, y sus ojos amarillos nos miraban con rabia.
Medía como cuatro metros de largo. La criatura soltó un silbido tan profundo que hizo temblar
el agua de toda la laguna.

-- 5 of 8 --', NULL, '2026-06-12 17:31:28.722279+00', '2026-06-12 17:34:31.05053+00', NULL, NULL, 'plain', NULL, '{}'),
('69ef4888-747f-4f91-a5fc-b71fce06288f', 'fb4df5f8-eb0e-47ab-b5c2-36baa74933a1', '1', NULL, '', NULL, '2026-07-14 20:08:21.377851+00', '2026-07-14 21:18:42.860499+00', '{"blocks": []}', '', 'editorjs', NULL, '{"words": 0, "blocks": 0, "characters": 0}'),
('aca20de4-6ace-4c64-a847-08f521415145', 'd2942c6e-fd36-4882-bc8e-e3e87e888c17', '1', 'La bruja empieza', 'habia una vez..', NULL, '2026-06-08 14:44:25.722474+00', '2026-06-08 14:45:32.771999+00', NULL, NULL, 'plain', NULL, '{}'),
('654bc491-a65b-4daf-befa-590a147871e9', '249bd130-7e8f-48b6-aa95-03e1f439ae25', '2', 'Pagina 2', 'La Serpiente de Mar
CAPÍTULO IV
7
Las alas de agua y luz
Los soldados empezaron a disparar y la serpiente se movió con fuerza, golpeando los árboles.
Yo me quedé paralizada… hasta que vi algo todavía más asombroso.
—¡Miren! —grité—. ¡Le están saliendo alas!
De sus costados brotaban unas alas transparentes, como hechas de agua y de luz.
—¿Qué clase de animal es ése…? —murmuró un soldado.

-- 6 of 8 --

La Serpiente de Mar
CAPÍTULO V
Se la llevaron amarrada mientras todo el pueblo miraba. Esa noche mi abuelita encendió
veladoras y, muy bajito, me dijo: —Cierra bien la ventana, hija… porque las serpientes de mar
nunca viajan solas.
8

-- 7 of 8 --

La Serpiente de Mar
La voz de la laguna
Este relato pertenece a la tradición oral de las comunidades costeras de México. La
laguna, los manglares y sus criaturas forman un mundo lleno de símbolos: el respeto
por la naturaleza, el misterio de lo desconocido y la sabiduría de los abuelos que
recuerdan lo que el mundo moderno prefiere olvidar.
La «serpiente de mar» no es solo un ser fantástico: es la voz de la laguna, que —como
decía la abuelita— habla, aunque no tenga boca.

-- 8 of 8 --', NULL, '2026-06-12 17:31:28.722279+00', '2026-06-12 17:34:31.184596+00', NULL, NULL, 'plain', NULL, '{}'),
('8003fb72-f5ef-409b-bd2e-fd2af1d5cd42', '8b9fb982-967d-403b-ac35-6985f6e0d8c9', '1', 'Holaaaa mundo', 'Un "Hola mundo" es el programa informático más básico que existe. Su única función es mostrar el texto "¡Hola, mundo!" en la pantalla. Sirve como el primer ejercicio tradicional para principiantes y como una prueba rápida para verificar que el entorno de programación funciona correctamente.', NULL, '2026-07-06 01:54:14.803734+00', '2026-07-13 14:17:52.383157+00', E'{"time": 1783346450159, "blocks": [{"id": "ABrX9pUC8S", "data": {"text": "Un \\"Hola mundo\\" es el programa informático más básico que existe. Su única función es mostrar el texto \\"¡Hola, mundo!\\" en la pantalla. Sirve como el primer ejercicio tradicional para principiantes y como una prueba rápida para verificar que el entorno de programación funciona correctamente."}, "type": "paragraph"}], "version": "2.31.6"}', '<p>Un "Hola mundo" es el programa informático más básico que existe. Su única función es mostrar el texto "¡Hola, mundo!" en la pantalla. Sirve como el primer ejercicio tradicional para principiantes y como una prueba rápida para verificar que el entorno de programación funciona correctamente.</p>', 'editorjs', '2.31.6', '{"words": 45, "blocks": 1, "characters": 291}'),
('7f3061b7-fb0b-4517-9380-2a836367a606', '8b9fb982-967d-403b-ac35-6985f6e0d8c9', '2', 'Que es python', 'Python es un lenguaje de programación de alto nivel, versátil y de código abierto. Destaca por su sintaxis sencilla y legible —muy parecida al lenguaje humano— lo que lo hace ideal para principiantes. Se utiliza ampliamente para el desarrollo web, inteligencia artificial, análisis de datos y automatización de tareas', NULL, '2026-07-06 13:12:46.376535+00', '2026-07-13 14:17:52.440528+00', '{"time": 1783346028253, "blocks": [{"id": "0UDjX0N9MR", "data": {"text": "Python es un lenguaje de programación de alto nivel, versátil y de código abierto. Destaca por su sintaxis sencilla y legible —muy parecida al lenguaje humano— lo que lo hace ideal para principiantes. Se utiliza ampliamente para el desarrollo web, inteligencia artificial, análisis de datos y automatización de tareas"}, "type": "paragraph"}], "version": "2.31.6"}', '<p>Python es un lenguaje de programación de alto nivel, versátil y de código abierto. Destaca por su sintaxis sencilla y legible —muy parecida al lenguaje humano— lo que lo hace ideal para principiantes. Se utiliza ampliamente para el desarrollo web, inteligencia artificial, análisis de datos y automatización de tareas</p>', 'editorjs', '2.31.6', '{"words": 49, "blocks": 1, "characters": 317}'),
('cb46d17a-8e67-435a-9075-e5ba60fadb68', 'e49e950b-84e4-442d-9963-7746a50db77d', '3', NULL, 'Encabezado 1', NULL, '2026-06-29 14:16:52.507516+00', '2026-07-08 05:24:18.767983+00', '{"time": 1782742743836, "blocks": [{"id": "NEW5vKV7Vk", "data": {"content": [["Encabezado 1"]], "stretched": false, "withHeadings": true}, "type": "table"}, {"id": "CGQon5ptS0", "data": {"crop": null, "title": "51b75da2-c565-4251-b6e9-345fa3db2355.glb", "layout": {"x": 253, "y": 221, "mode": "free", "align": "center", "layer": "above-text", "width": 669, "height": 436, "locked": false, "zIndex": 1, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "2c307a27-bee4-4fab-98cf-104e4d1dddc0", "caption": "", "imageUrl": "", "modelUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742445500-51b75da2-c565-4251-b6e9-345fa3db2355.glb", "displayMode": "inline-model"}, "type": "model3d"}], "version": "2.31.6"}', '<table class="ejs-table"><tbody><tr><th>Encabezado 1</th></tr></tbody></table>
<div class="ejs-model3d"><strong>51b75da2-c565-4251-b6e9-345fa3db2355.glb</strong></div>', 'editorjs', '2.31.6', '{"words": 2, "blocks": 2, "characters": 12}'),
('918a3bc1-146a-41df-be34-06ae22d58b10', 'd3dd44a3-eef1-4565-809d-1252a5a63b72', '1', NULL, '', NULL, '2026-06-20 16:36:22.698684+00', '2026-07-05 14:53:51.609262+00', '{"time": 1783263229896, "blocks": [{"id": "G0bqQpEJyw", "data": {"crop": null, "title": "6ff0c527-a500-410c-ada0-abb8393c2680.glb", "layout": {"x": 265, "y": 253, "mode": "free", "align": "center", "layer": "above-text", "width": 586, "height": 326, "locked": false, "zIndex": 3, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "58ad8e05-7997-4173-b5fe-bd0bd5f8a9e9", "caption": "", "imageUrl": "", "modelUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/legends/74d2e940-2fd4-45ad-9698-a273058569ac/models/1781974027891-6ff0c527-a500-410c-ada0-abb8393c2680.glb", "displayMode": "inline-model"}, "type": "model3d"}, {"id": "4D0pmTdX-v", "data": {"alt": "", "crop": null, "file": {"url": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074664092-cenote_labruja1.jpg"}, "layout": {"x": 33, "y": 110, "mode": "free", "align": "center", "layer": "above-text", "width": 1120, "height": 500, "locked": false, "zIndex": 2, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "68583f2a-05bd-46c4-bf89-71048c280c3f", "caption": "", "stretched": false, "withBorder": false, "withBackground": false}, "type": "image"}], "version": "2.31.6"}', '<div class="ejs-model3d"><strong>6ff0c527-a500-410c-ada0-abb8393c2680.glb</strong></div>
<figure class="ejs-image"><img src="https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/74d2e940-2fd4-45ad-9698-a273058569ac/editor_image/1782074664092-cenote_labruja1.jpg" alt="" /></figure>', 'editorjs', '2.31.6', '{"words": 0, "blocks": 2, "characters": 0}'),
('eade30e3-feab-4143-b9a8-930ba6feb57e', 'e49e950b-84e4-442d-9963-7746a50db77d', '1', NULL, '', NULL, '2026-06-29 14:11:58.324363+00', '2026-07-08 05:24:18.665834+00', '{"time": 1782742753012, "blocks": [{"id": "DleOkE3apl", "data": {"alt": "", "crop": null, "file": {"url": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg"}, "layout": {"x": 322, "y": 63, "mode": "free", "align": "center", "layer": "above-text", "width": 520, "height": 320, "locked": false, "zIndex": 2, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "1f952d8f-3820-4181-9a59-cb7a5999f426", "caption": "", "stretched": false, "withBorder": false, "withBackground": false}, "type": "image"}], "version": "2.31.6"}', '<figure class="ejs-image"><img src="https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg" alt="" /></figure>', 'editorjs', '2.31.6', '{"words": 0, "blocks": 1, "characters": 0}'),
('36d261b6-1943-4e23-8fca-edf2f9bdc61e', '8b9fb982-967d-403b-ac35-6985f6e0d8c9', '3', 'Que es la metodologia srum', 'Scrum es un marco de trabajo ágil que divide proyectos complejos en ciclos cortos e iterativos llamados sprints (de 1 a 4 semanas). Fomenta la colaboración, la autoorganización del equipo y la mejora continua mediante entregas parciales y regulares. Pilares de ScrumEl marco se sustenta en tres principios básicos:
Transparencia: Todos los involucrados tienen visibilidad del progreso y de los obstáculos del proyecto. Inspección: Se evalúa constantemente el trabajo realizado para detectar problemas o desviaciones. Adaptación: El equipo ajusta su enfoque y procesos de manera flexible ante los cambios del entorno.', NULL, '2026-07-06 13:55:41.545771+00', '2026-07-13 14:17:52.487816+00', '{"time": 1783346140798, "blocks": [{"id": "P6OBx99CxI", "data": {"text": "Scrum es un marco de trabajo ágil que divide proyectos complejos en ciclos cortos e iterativos llamados sprints (de 1 a 4 semanas). Fomenta la colaboración, la autoorganización del equipo y la mejora continua mediante entregas parciales y regulares. Pilares de ScrumEl marco se sustenta en tres principios básicos:"}, "type": "paragraph"}, {"id": "-CuuZRw1CB", "data": {"meta": {}, "items": [{"meta": {}, "items": [], "content": "Transparencia: Todos los involucrados tienen visibilidad del progreso y de los obstáculos del proyecto."}, {"meta": {}, "items": [], "content": "Inspección: Se evalúa constantemente el trabajo realizado para detectar problemas o desviaciones."}, {"meta": {}, "items": [], "content": "Adaptación: El equipo ajusta su enfoque y procesos de manera flexible ante los cambios del entorno. "}], "style": "unordered"}, "type": "list"}, {"id": "sdXYD66W6p", "data": {"crop": null, "title": "El sismite.glb", "layout": {"x": 217, "y": 261, "mode": "free", "align": "center", "layer": "above-text", "width": 614, "height": 425, "locked": false, "zIndex": 1, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "f3efa324-c9ab-408a-97fd-28a20b4af1e5", "caption": "", "imageUrl": "", "modelUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/abd56927-c4c4-4c22-8301-f4af3ed61303/model_3d/1783346112035-el-sismite.glb", "displayMode": "inline-model"}, "type": "model3d"}], "version": "2.31.6"}', '<p>Scrum es un marco de trabajo ágil que divide proyectos complejos en ciclos cortos e iterativos llamados sprints (de 1 a 4 semanas). Fomenta la colaboración, la autoorganización del equipo y la mejora continua mediante entregas parciales y regulares. Pilares de ScrumEl marco se sustenta en tres principios básicos:</p>
<ul><li>Transparencia: Todos los involucrados tienen visibilidad del progreso y de los obstáculos del proyecto.</li><li>Inspección: Se evalúa constantemente el trabajo realizado para detectar problemas o desviaciones.</li><li>Adaptación: El equipo ajusta su enfoque y procesos de manera flexible ante los cambios del entorno. </li></ul>
<div class="ejs-model3d"><strong>El sismite.glb</strong></div>', 'editorjs', '2.31.6', '{"words": 91, "blocks": 3, "characters": 616}'),
('920d1de7-1919-443a-a220-a38a00f6beb6', 'e49e950b-84e4-442d-9963-7746a50db77d', '2', NULL, '', NULL, '2026-06-29 14:13:16.461653+00', '2026-07-08 05:24:18.735285+00', '{"time": 1782742746821, "blocks": [{"id": "DleOkE3apl", "data": {"alt": "", "crop": null, "file": {"url": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg"}, "layout": {"x": 322, "y": 63, "mode": "free", "align": "center", "layer": "above-text", "width": 520, "height": 320, "locked": false, "zIndex": 2, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "1f952d8f-3820-4181-9a59-cb7a5999f426", "caption": "", "stretched": false, "withBorder": false, "withBackground": false}, "type": "image"}, {"id": "i_Gb2lKdaS", "data": {"crop": null, "title": "6ff0c527-a500-410c-ada0-abb8393c2680.glb", "layout": {"x": 275, "y": 125, "mode": "free", "align": "center", "layer": "above-text", "width": 615, "height": 426, "locked": false, "zIndex": 2, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "f899db0d-021e-411d-a54f-c91e739f47cc", "caption": "", "imageUrl": "", "modelUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/model_3d/1782742285548-6ff0c527-a500-410c-ada0-abb8393c2680.glb", "displayMode": "inline-model"}, "type": "model3d"}], "version": "2.31.6"}', '<figure class="ejs-image"><img src="https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/45341e0c-7229-46c4-b797-dd8ceb4a5474/editor_image/1782742271112-8-jpg.jpeg" alt="" /></figure>
<div class="ejs-model3d"><strong>6ff0c527-a500-410c-ada0-abb8393c2680.glb</strong></div>', 'editorjs', '2.31.6', '{"words": 0, "blocks": 2, "characters": 0}'),
('16eba505-8ff9-4e13-9fb0-9f52b5b450ba', 'a3555aa0-5a63-40c2-9fc1-a059855639c6', '3', 'deffcd', '', NULL, '2026-07-07 02:19:22.17369+00', '2026-07-13 14:21:54.552647+00', '{"time": 1783390764454, "blocks": [], "version": "2.31.6"}', '', 'editorjs', '2.31.6', '{"words": 0, "blocks": 0, "characters": 0}'),
('f3ab2bca-7ccb-49c4-bedd-997e4c41c5ae', 'a3555aa0-5a63-40c2-9fc1-a059855639c6', '4', 'fdfdfdfd', 'fdfdfdfdf', NULL, '2026-07-07 02:19:22.213379+00', '2026-07-13 14:21:54.60503+00', '{"time": 1783390759287, "blocks": [{"id": "t0eIptHuro", "data": {"text": "fdfdfdfdf"}, "type": "paragraph"}], "version": "2.31.6"}', '<p>fdfdfdfdf</p>', 'editorjs', '2.31.6', '{"words": 1, "blocks": 1, "characters": 9}'),
('eed5d74b-51be-4cd0-8342-d21942d369c6', 'a3555aa0-5a63-40c2-9fc1-a059855639c6', '1', 'Introduccíon', '&nbsp; &nbsp; &nbsp; La introduccion de esta historia el principito
 fgfgfgfgfgfgfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg gfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg', NULL, '2026-07-06 14:08:45.627051+00', '2026-07-13 14:21:54.456579+00', '{"time": 1783457564195, "blocks": [{"id": "4kHDCq9haw", "data": {"text": "&nbsp; &nbsp; &nbsp; La introduccion de esta historia el principito"}, "type": "paragraph"}, {"id": "M2hitm6xyN", "data": {"text": " fgfgfgfgfgfgfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg gfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg"}, "type": "paragraph"}, {"id": "VCzOn2DL5_", "data": {"alt": "", "crop": null, "file": {"url": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783351449424-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg"}, "layout": {"x": 21, "y": 168, "mode": "free", "align": "center", "layer": "above-text", "width": 520, "height": 320, "locked": false, "zIndex": 4, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "78fd255c-8c1e-4ddf-bae3-e39fc606d423", "caption": "", "stretched": false, "withBorder": false, "withBackground": false}, "type": "image"}], "version": "2.31.6"}', '<p>      La introduccion de esta historia el principito</p>
<p> fgfgfgfgfgfgfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg gfggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg</p>
<figure class="ejs-image"><img src="https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/editor_image/1783351449424-whatsapp-image-2026-07-05-at-9-13-12-am.jpeg" alt="" /></figure>', 'editorjs', '2.31.6', '{"words": 12, "blocks": 3, "characters": 353}'),
('baec0bde-63b0-4ca3-90ea-ea8cbda3d950', 'a3555aa0-5a63-40c2-9fc1-a059855639c6', '2', 'Pruebas unitarias', '', NULL, '2026-07-06 14:15:08.709345+00', '2026-07-13 14:21:54.499812+00', '{"time": 1783390776173, "blocks": [{"id": "q9snLJO8U8", "data": {"crop": null, "title": "WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg", "layout": {"x": 130, "y": 155, "mode": "free", "align": "center", "layer": "above-text", "width": 311, "height": 307, "locked": false, "zIndex": 1, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "d30d1913-f2cc-49b1-8555-5fc592d26935", "caption": "", "imageUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/marker_image/1783351535035-whatsapp-image-2026-07-02-at-8-18-26-pm.jpeg", "modelUrl": "", "displayMode": "inline-card"}, "type": "leyendaMarker"}, {"id": "sgoga2pyvr", "data": {"crop": null, "title": "51b75da2-c565-4251-b6e9-345fa3db2355.glb", "layout": {"x": 438, "y": 217, "mode": "free", "align": "center", "layer": "above-text", "width": 474, "height": 364, "locked": false, "zIndex": 1, "opacity": 1, "rotation": 0, "anchorBlockId": ""}, "assetId": "92bf14bc-78ea-4dad-928c-a2454f65f166", "caption": "", "imageUrl": "", "modelUrl": "https://wkkzgyhyarqwxoqcdaul.supabase.co/storage/v1/object/public/legend-assets/2f412137-0da6-4865-bf6d-dc121c54beb5/bf81e49f-3b51-4853-a43e-4e8cc5041be8/model_3d/1783347334322-51b75da2-c565-4251-b6e9-345fa3db2355.glb", "displayMode": "inline-model"}, "type": "model3d"}], "version": "2.31.6"}', '<div class="ejs-marker"><strong>WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg</strong></div>
<div class="ejs-model3d"><strong>51b75da2-c565-4251-b6e9-345fa3db2355.glb</strong></div>', 'editorjs', '2.31.6', '{"words": 0, "blocks": 2, "characters": 0}')
on conflict do nothing;

-- ========== code_requests ==========
INSERT INTO public.code_requests (id, creator_id, legend_id, edition_id, quantity_requested, reason, status, reviewed_by, reviewed_at, admin_feedback, created_at, updated_at) VALUES ('4b6b577f-cf4a-4f8c-bf3e-5da36103f55d', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'a66d7f5b-13e3-437e-947d-54b703351e36', '2', 'Generado por el autor', 'generated', NULL, '2026-07-13 14:14:18.148608+00', NULL, '2026-07-13 14:14:18.148608+00', '2026-07-13 14:14:18.148608+00'),
('750b1360-5e1d-4743-9160-35784d3b62e1', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'abd56927-c4c4-4c22-8301-f4af3ed61303', 'a66d7f5b-13e3-437e-947d-54b703351e36', '2', 'Generado por el autor', 'generated', NULL, '2026-07-13 14:19:12.809571+00', NULL, '2026-07-13 14:19:12.809571+00', '2026-07-13 14:19:12.809571+00')
on conflict do nothing;

-- ========== products ==========
INSERT INTO public.products (id, product_type, legend_id, edition_id, name, description, price, currency, status, created_at, updated_at) VALUES ('46e2dc11-6eb2-4586-a363-892b6a814fca', 'subscription_plan', NULL, NULL, 'Plan Cultural Mensual', 'Suscripción simulada mensual para acceder a leyendas premium dentro de la plataforma.', '49.00', 'MXN', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00'),
('22857d46-095e-4cc4-a592-8950766a3edc', 'subscription_plan', NULL, NULL, 'Plan Escolar Trimestral', 'Suscripción simulada trimestral pensada para demostraciones escolares y culturales.', '129.00', 'MXN', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00'),
('4efe495c-aeaf-43dc-b40e-a06b15f931bb', 'subscription_plan', NULL, NULL, 'Plan Cultural Anual', 'Suscripción simulada anual para acceso completo a leyendas premium.', '399.00', 'MXN', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00'),
('ae540b9e-d63a-4515-9b29-9cae835bb147', 'digital_legend', '8b3a3ab9-cc87-4847-8eec-b1e65cf6b772', NULL, 'El cura sin cabeza - Digital', 'Compra digital simulada de la leyenda El cura sin cabeza.', '59.00', 'MXN', 'active', '2026-05-25 02:21:54.309466+00', '2026-05-25 02:21:54.309466+00')
on conflict do nothing;

-- ========== content_reviews ==========
INSERT INTO public.content_reviews (id, legend_version_id, submitted_by, reviewed_by, status, feedback, created_at, reviewed_at, updated_at) VALUES ('a7b8064d-b6c4-48e2-b714-09ccc063bf42', '6cb5ab8d-ff6f-4090-a00d-58741a597ecc', '9ac6c729-6c1f-41a1-9bff-38ca5a2ab8d2', NULL, 'approved', 'Contenido aprobado para publicación.', '2026-05-25 01:24:49.539612+00', '2026-05-25 01:41:00.44098+00', '2026-05-26 03:52:27.333694+00'),
('9753fb13-e13d-406d-b19c-fd585eab7306', '249bd130-7e8f-48b6-aa95-03e1f439ae25', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approved', 'pefecto', '2026-06-12 17:34:31.410396+00', '2026-06-12 17:35:11.479967+00', '2026-06-12 17:35:11.479967+00'),
('ccb7d8ce-6e83-4dd5-be89-e1044de5a452', 'd2942c6e-fd36-4882-bc8e-e3e87e888c17', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approved', NULL, '2026-06-08 14:45:32.994166+00', '2026-06-12 17:35:15.418793+00', '2026-06-12 17:35:15.418793+00'),
('e0dc47d5-3971-40f1-b672-1077d7d92ab2', 'e49e950b-84e4-442d-9963-7746a50db77d', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, 'pending', NULL, '2026-07-08 05:24:19.09877+00', NULL, '2026-07-08 05:24:19.09877+00'),
('b4102695-5046-465d-b33d-9986c5b44f80', '8b9fb982-967d-403b-ac35-6985f6e0d8c9', '2f412137-0da6-4865-bf6d-dc121c54beb5', '18c428e0-ada7-4aa6-8993-1a33be7be6fd', 'approved', 'Perfecto', '2026-07-13 14:17:52.870472+00', '2026-07-13 14:18:23.504938+00', '2026-07-13 14:18:23.504938+00'),
('be475007-562c-4c64-93c8-e01623ba34a4', 'a3555aa0-5a63-40c2-9fc1-a059855639c6', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, 'pending', NULL, '2026-07-13 14:21:54.869483+00', NULL, '2026-07-13 14:21:54.869483+00'),
('d4d7bd73-bf20-4c5e-be19-2420518b3927', '2ec7ea42-c41b-4ca8-ae28-a8df9916d2d9', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, 'pending', NULL, '2026-07-14 04:47:11.643609+00', NULL, '2026-07-14 04:47:11.643609+00')
on conflict do nothing;

-- ========== document_extractions ==========
INSERT INTO public.document_extractions (id, source_document_id, extracted_text, status, error_message, created_at) VALUES ('f034b2ba-054f-4da3-9140-12a0999f39f1', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'La Serpiente de Mar
Tradición oral de la costa

-- 1 of 8 --

-- 2 of 8 --

La Serpiente de Mar
CAPÍTULO I
La niña de la laguna
Cuando yo era pequeña vivía con mi abuelita a la orilla de la laguna, en una casita de madera
que olía a sal y a leña. Cada mañana me despertaba el canto de los pájaros y el golpeteo del
agua contra los palos del muelle.
Lo que más me gustaba era ir a pescar al puente. Atrapaba pescaditos con un poco de
nixtamal y, cuando nadie me veía, me tiraba clavados al agua tibia.
—¡Abuelita! ¿Ya es hora de lavar el nixtamal? —le gritaba.
—Sí, hija —contestaba ella.
Pero la verdad, lavar nixtamal no me gustaba nada. Yo soñaba con pescar peces grandes y
bonitos, y hasta langostas… aunque casi siempre solo caían sardinas.

-- 3 of 8 --

La Serpiente de Mar
CAPÍTULO II
Los hombres del cayuco
Una tarde calurosa estaba sentada en el puente, dándoles de comer a los pescaditos, cuando
se acercó un cayuco con unos señores.
—¿Qué haces, nena? —me preguntó uno, sonriendo.
—Aquí, criando pescaditos —respondí muy orgullosa.
Los señores se rieron y siguieron remando despacito por la orilla, perdiéndose entre los
manglares verdes. Yo me quedé jugando con el agua, sin imaginar que esa tarde no sería
como las demás.
4
El aviso
No pasó mucho rato cuando uno de los señores regresó remando con todas sus fuerzas.
Venía pálido y gritaba:
—¡Anda, niña! ¡Avísale a los soldados que hay un animal bien grandote!
—¿No será que me quieren quitar mis pescaditos? —pensé desconfiada.
—¡Claro que no! Es un animal enorme… ¡y a lo mejor hasta te come! —me advirtió.
Sentí un escalofrío. Solté mi cubo, mi anzuelo y mi nixtamal, y salí corriendo hacia mi casa tan
rápido como pude.

-- 4 of 8 --

La Serpiente de Mar
CAPÍTULO III
5
La abuelita no me creía
Llegué temblando y muy pálida.
—¿Qué tienes, hija? —preguntó mi abuelita.
—¡Un señor dice que hay un monstruo en la laguna y que llame a los soldados!
—Estás loca —se rió ella—. De seguro solo te andaban espantando.
Pero yo sabía lo que había oído. Así que fui yo solita a buscar a los soldados y, de regreso, me
llevé a mi abuelita casi a rastras hasta la orilla. El viento soplaba raro entre los manglares, y
nadie se atrevía a hablar fuerte.
6
La serpiente del monte
Cuando llegamos, los soldados avanzaron apuntando hacia el monte. Y entonces la vimos.
Era enorme. Estaba enrollada entre los arbustos, y sus escamas brillaban con colores verdes,
azules y negros. Su cabeza parecía la de un cocodrilo, pero mucho más larga; sus colmillos
eran grandes y feos, y sus ojos amarillos nos miraban con rabia.
Medía como cuatro metros de largo. La criatura soltó un silbido tan profundo que hizo temblar
el agua de toda la laguna.

-- 5 of 8 --

La Serpiente de Mar
CAPÍTULO IV
7
Las alas de agua y luz
Los soldados empezaron a disparar y la serpiente se movió con fuerza, golpeando los árboles.
Yo me quedé paralizada… hasta que vi algo todavía más asombroso.
—¡Miren! —grité—. ¡Le están saliendo alas!
De sus costados brotaban unas alas transparentes, como hechas de agua y de luz.
—¿Qué clase de animal es ése…? —murmuró un soldado.

-- 6 of 8 --

La Serpiente de Mar
CAPÍTULO V
Se la llevaron amarrada mientras todo el pueblo miraba. Esa noche mi abuelita encendió
veladoras y, muy bajito, me dijo: —Cierra bien la ventana, hija… porque las serpientes de mar
nunca viajan solas.
8

-- 7 of 8 --

La Serpiente de Mar
La voz de la laguna
Este relato pertenece a la tradición oral de las comunidades costeras de México. La
laguna, los manglares y sus criaturas forman un mundo lleno de símbolos: el respeto
por la naturaleza, el misterio de lo desconocido y la sabiduría de los abuelos que
recuerdan lo que el mundo moderno prefiere olvidar.
La «serpiente de mar» no es solo un ser fantástico: es la voz de la laguna, que —como
decía la abuelita— habla, aunque no tenga boca.

-- 8 of 8 --', 'completed', NULL, '2026-06-12 17:31:25.500911+00'),
('c849ba9a-ff8d-4369-8cbf-992464b65768', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'A Web Platform for Interactive Digital Books with
Augmented Reality in Cultural Heritage: A Case
Study of Bacalar
Anonymous Authors
Submission for blind review
Abstract—The digital dissemination of local cultural her-
itage remains limited by the lack of integrated platforms
capable of combining editorial management, interactive digital
reading, and augmented reality in a single cohesive system.
This paper presents the design and development of a web
platform for publishing and visualizing interactive digital
books with augmented reality, applied to cultural narratives
of Bacalar, Quintana Roo, Mexico. The system adopts a three-
tier architecture based on React, Supabase as a backend-as-a-
service layer, and PostgreSQL with row-level security policies.
Three differentiated user roles are defined—reader, author, and
administrator—with a structured editorial workflow covering
draft, review, and publication stages. Augmented reality is
integrated as an externally linked component using Unity 6
and Vuforia Engine 11.4.4, activated through image markers
to display 3D models related to the cultural narrative. The
resulting platform is available as a functional web prototype
and supports user authentication, role-based access control,
content publication workflows, digital book visualization, and
integration with augmented reality resources. The public URL
has been omitted for blind review. The illustrated digital
book Leyendas de Bacalar serves as a functional case study
for validating the proposed architecture. Results confirm the
feasibility of the architecture and its potential for scalability
toward other cultural destinations.
Index Terms—web platform, interactive digital books,
augmented reality, cultural heritage, software architecture,
backend-as-a-service, role-based access control, Bacalar
I. Introduction
Cultural heritage preservation and dissemination have
increasingly relied on digital technologies over the past
two decades. However, most existing digital initiatives
treat content, platform, and interactive experience as
separate concerns, requiring users to navigate multiple
tools to access a complete cultural narrative [2]. This
fragmentation is particularly evident in local and regional
heritage contexts, where resources for producing dedicated
applications are limited and the communities whose her-
itage is at stake are seldom involved in the production
process [7].
Augmented reality (AR) has emerged as a promising
technology for enriching cultural heritage experiences
by overlaying digital content onto physical artifacts or
spaces [11]. Several studies have demonstrated that AR-
enhanced books can improve engagement, comprehension,
and motivation in readers of different ages [1], [5]. Yet,
the software engineering challenge of building a platform
that manages the complete lifecycle of such content—
from authoring and editorial review to publication and AR
activation—has received comparatively little attention.
Bacalar, a municipality in Quintana Roo, Mexico, pos-
sesses a rich cultural and historical heritage, including
colonial fortifications, oral legends, and a distinctive nat-
ural landscape. Despite its growing relevance as a cultural
tourism destination, digital tools for disseminating its local
narratives in interactive form remain scarce.
This paper addresses that gap by presenting the de-
sign and development of a functional web platform that
integrates three components: (1) a structured editorial
management system with differentiated user roles based on
Role-Based Access Control [9]; (2) an interactive digital
book reader organized by pages; and (3) an augmented
reality module linked to the platform through Unity 6 and
Vuforia Engine 11.4.4. The platform has been deployed
as a functional prototype; the public URL has been
omitted for blind review. This work reports the first
functional version of an applied software development
project, where the core architecture, user roles, content
workflow, and AR integration have been implemented,
while usability refinements and extended user evaluation
remain as ongoing work.
The main contributions of this paper are:
1) a three-tier web architecture for managing interac-
tive AR-enhanced digital books, combining React,
Supabase BaaS, and PostgreSQL with RLS policies;
2) a role-based editorial workflow for authoring, review-
ing, and publishing cultural narratives, following
RBAC principles;
3) a relational content model for pages, resources,
AR markers, access codes, and user roles, designed
following normalization principles to ensure consis-
tency and avoid redundancy;
4) a decoupled AR integration strategy using Unity 6
and Vuforia Engine 11.4.4 as an external module
independently linked to the web platform;
5) a functional case study based on the cultural narra-
tives of Bacalar, Quintana Roo, Mexico.
The remainder of this paper is organized as follows.
Section II reviews related work. Section III describes the
system architecture. Section IV presents functional and
non-functional requirements. Section V details the de-

-- 1 of 9 --

velopment methodology and implementation. Section VI
describes the AR integration. Section VII presents the
case study. Section VIII reports testing results. Section IX
discusses the findings, and Section X presents conclusions
and future work.
II. Related Work
A. Augmented Reality and Cultural Heritage
The use of AR in cultural heritage has grown substan-
tially over the past decade. Boboc et al. [2] conducted a
bibliometric review of AR applications in cultural heritage
between 2012 and 2021, identifying eight predominant
research lines: 3D reconstruction, digital heritage, virtual
museums, user experience, education, tourism, intangible
cultural heritage, and gamification. Their review confirms
AR as a consolidated technology for heritage preservation
and dissemination while identifying persistent challenges
in user experience design, technical accessibility, and
content production.
Zhang and Peng [7] reviewed co-creation in immersive
learning for cultural heritage education, identifying three
participation patterns: full co-creation, iterative refine-
ment, and consultative validation. Their findings support
interdisciplinary development models where technical and
creative expertise are combined, as in the project reported
here.
B. AR-Enhanced Digital Books
Wang [1] analyzed AR in children’s picture books
from an educational psychology perspective, proposing
design principles—simple operation, guided interaction,
and timely feedback—that translate directly to the design
of the interactive digital reader in the proposed platform.
Alhamad et al. [5] explored reading engagement in AR
books across behavioral, cognitive, affective, and social
dimensions, finding that AR-enhanced books alter reading
strategies, increase visual exploration, and promote posi-
tive emotions. These dimensions inform the design criteria
for the digital book component. Cazar Puruncajas et al. [8]
documented practical approaches to enriching educational
materials with AR markers, 3D models, and multimedia
resources, illustrating the potential of AR-enhanced books
as bridges between physical and digital content.
C. Web Platforms, Editorial Workflows, and Role-Based
Access Control
Role-based access control (RBAC) is a well-established
model for managing permissions in multi-user systems.
Sandhu et al. [9] formalized RBAC with four core com-
ponents: users, roles, permissions, and operations. This
model directly informs the three-role architecture of the
proposed platform: reader, author, and administrator,
with permissions enforced at both the interface and the
database levels through PostgreSQL RLS policies [13].
Willinsky [10] documented Open Journal Systems (OJS)
as a reference web platform for academic publishing with
submission, peer review, editing, and indexing workflows.
Although OJS targets academic journals, its editorial
lifecycle—submission, review, approval, and publication—
provides a relevant precedent for the content publication
workflow implemented in the proposed platform.
Quartulli et al. [6] reviewed adaptive architectures
for gamified learning in software engineering education,
identifying modular, web-based systems with role differen-
tiation and analytics as dominant patterns. Their analysis
of scalable web architectures informs key design decisions
in the proposed system, particularly the separation of
reader, author, and administrator modules.
D. Software Architecture and Decoupled AR Integration
Azuma et al. [11] provided a foundational technical
framework for AR systems, identifying tracking, regis-
tration, display, and interaction as core concerns. This
framing is particularly relevant when AR is treated not
as a standalone application but as a module decoupled
from a broader software architecture, as in the platform
presented here. The separation between the web platform
(which controls and organizes content) and the AR appli-
cation (which recognizes and renders) follows this principle
directly.
E. Immersive Learning as Application Context
Gandolfi and Ferdig [4] validated the Augmented Real-
ity Presence Scale (ARPS), finding positive correlations
between AR presence and the four dimensions of the
ARCS motivation model: attention, relevance, confidence,
and satisfaction. These dimensions serve as future eval-
uation criteria for the AR experience embedded in the
platform. Shidende and Moebs [3] integrated Design-
Based Research with Agile Scrum for an accessible AR
authoring tool, demonstrating that iterative cycles aligned
with sprint planning produce functional prototypes while
maintaining research rigor, a methodological integration
adopted in this project. Together, these works establish the
foundation for the architecture, workflow, and integration
strategy presented in the following sections.
III. System Architecture
A. Architectural Decision
The central architectural decision was to adopt a
backend-as-a-service (BaaS) model using Supabase [12]
rather than building a traditional server-side backend. Su-
pabase integrates authentication, managed PostgreSQL,
file storage, Row Level Security (RLS) [13], Remote Pro-
cedure Calls via PostgreSQL functions, and real-time APIs
in a single platform. This reduces backend complexity
for a small development team while providing a secure,
modular, and scalable foundation.
The main alternatives considered were Node.js with
Express, NestJS, Firebase Firestore, and a custom Post-
greSQL deployment with a separate REST API layer.
Table I summarizes the key architectural decisions, the
alternatives evaluated, and the rationale for each choice.

-- 2 of 9 --

TABLE I
Key Architectural Decisions
Decision Selected Rationale Alternative
Backend
model
Supabase
BaaS
Integrated Auth,
PostgreSQL,
Storage,
RLS, APIs;
reduced backend
complexity
Node.js/NestJS,
Firebase
Access
control
RBAC
+ Post-
greSQL
RLS
Role-based
permissions
enforced at both
UI and database
levels
Frontend-only
route guards
AR inte-
gration
Decoupled
Unity /
Vuforia
module
Independent
evolution of web
platform and AR
experience
Embedded
WebAR
Frontend React +
Vite +
Tailwind
CSS
Component-
based UI,
responsive
design, fast
build pipeline
Server-
rendered
UI
Database Post-
greSQL
relational
model
Structured
content, roles,
pages, resources,
access codes;
normalized
relational schema
NoSQL docu-
ment database
B. Three-Tier Architecture
The platform is organized into three main layers, illus-
trated in Fig. 1.
Fig. 1. General system architecture: frontend (React + Vite + Tail-
wind CSS), backend-as-a-service (Supabase), and externally linked
augmented reality component (Unity 6 + Vuforia Engine 11.4.4).
Frontend layer. Developed with React 19 [14], Vite 8,
and Tailwind CSS 4.3. React’s component-based model
enables a modular interface where each role accesses only
the sections and tools corresponding to its permissions.
Vite provides fast build and hot-reload capabilities, while
Tailwind CSS supports responsive design across desktop,
tablet, and mobile devices.
Backend-as-a-service layer. Supabase provides authen-
tication via email and password through Supabase Auth,
file storage for covers, images, 3D models, and AR markers
through Supabase Storage, and data management through
a managed PostgreSQL instance. RLS policies restrict
data access at the database level, ensuring that each
role can only read or modify records permitted by their
assigned permissions. RPC functions via PostgreSQL cen-
tralize critical business logic such as access code validation
and publication state transitions.
The relational schema organizes the platform around
legends as the main content entity. Each legend is associ-
ated with ordered pages, media resources, AR markers, ac-
cess codes, publication states, and user-role relationships.
This structure allows content reuse, editorial traceability,
and independent management of digital and AR assets,
following normalization principles to avoid redundancy
and maintain consistency across all platform entities.
Augmented reality component. Unity 6 and Vuforia
Engine 11.4.4 constitute an externally linked module.
The web platform manages content, users, markers, and
digital resources; the AR application uses those resources
to deliver the augmented experience when a marker is
detected. This decoupled design allows the web platform
and the AR component to evolve independently. Three.js
and React Three Fiber are additionally integrated into
the frontend for in-browser 3D model preview without
requiring an external application.
C. Integration Diagram
Fig. 2 illustrates the interaction between the web
platform, the digital book, Unity, and Vuforia across the
complete user experience.
Fig. 2. Integration diagram: web platform, digital book, Unity 6,
and Vuforia Engine 11.4.4.
The following section details the functional and non-
functional requirements derived from this architecture and
the three-role access model.
IV. Functional and Non-Functional Requirements
A. User Roles and Access Control
The platform defines three primary roles following
the RBAC model [9], as shown in Fig. 3. Permissions
are enforced at two independent levels: interface-level
route guards in React, and database-level RLS policies in

-- 3 of 9 --

PostgreSQL, ensuring that unauthorized access via direct
URL manipulation is blocked at the data layer.
Fig. 3. Role diagram and access permissions for visitor, reader,
author/creator, and administrator.
A visitor can explore the public catalog and view general
book information without authenticating. A reader can
access the full catalog, read published legends, comment,
add favorites, and unlock premium content through unique
physical codes or simulated purchases. An author/cre-
ator, after administrator approval, can create legends,
add pages, upload multimedia resources, associate AR
markers, save drafts, and submit content for editorial
review. An administrator can manage users, approve or
reject creator requests, review submitted legends, approve
or request changes to content, generate unique access
codes, and oversee all platform activity.
B. Functional Requirements
Table II presents the primary functional requirements
of the system.
C. Non-Functional Requirements
Table III summarizes the primary non-functional re-
quirements.
These requirements guided every phase of the develop-
ment process described in the following section.
V. System Design and Implementation
A. Development Methodology
The project followed an incremental development ap-
proach with prototyping, supported by Scrum practices
[3]. This methodology was chosen because the system
comprises several interdependent modules—reader, author
panel, administrator panel, and AR experience—that
could not be developed simultaneously without a risk
of integration conflicts. Prototyping allowed the team
to validate interfaces before implementing backend logic.
Sprint-aligned reviews enabled early detection of permis-
sion issues, data relationship inconsistencies, and usability
problems corrected in subsequent iterations. The team
comprised students from software development and digital
animation undergraduate programs.
TABLE II
Functional Requirements
ID Requirement Actor Status
RF01 User registration and login
via email and password
All roles Imple-
mented
RF02 Browse published legend cat-
alog
Reader Imple-
mented
RF03 Visualize legend content
through a page-organized
digital reader
Reader Imple-
mented; UX
refinement
pending
RF04 Comment and add favorites
to published legends
Reader Imple-
mented; UX
refinement
pending
RF05 Request author/creator role Reader Imple-
mented
RF06 Create, edit, and save legends
with pages, images, and asso-
ciated resources
Author Imple-
mented;
refinement
pending
RF07 Submit a legend for editorial
review
Author Imple-
mented
RF08 Review, approve, reject, or
request changes to submitted
legends
Admin Imple-
mented
RF09 Associate AR markers and
3D models to specific book
pages
Author Imple-
mented; op-
timization
pending
RF10 Unlock premium content via
unique physical codes
Reader Imple-
mented
TABLE III
Non-Functional Requirements
ID Requirement Compliance Criterion
RNF01 Responsive interface
for desktop, tablet,
and mobile
Correct display at all screen
sizes
RNF02 Authentication and
role-based access
control
Readers cannot access au-
thor or admin panels; RLS
enforced at database level
RNF03 Normalized relational
database design
Consistent storage of users,
legends, roles, pages, and re-
sources without redundancy
RNF04 3D assets delivered via
CDN
Load time under 3 seconds
on standard connections
RNF05 AR marker detection
and 3D rendering
Activation under 2 sec-
onds after camera points to
marker
RNF06 Cross-platform web
compatibility
Correct operation on
Chrome, Safari, and Firefox
(last two versions)
RNF07 Scalable architecture New legends, users, or fea-
tures added without major
refactoring
RNF08 HTTPS communica-
tion and single-use
codes
Encrypted traffic; piracy
prevention

-- 4 of 9 --

B. Development Phases
The development was organized into eight sequential
phases:
1) Problem analysis and project definition. Identifica-
tion of user types, platform scope, and interdisci-
plinary collaboration model.
2) System structure design. Definition of modules,
routes, role-based permissions, and relationships
between legends, pages, images, 3D models, AR
markers, and unique access codes.
3) Database design. Design of a normalized PostgreSQL
schema covering users, roles, profiles, legends, pages,
resources, revisions, access codes, simulated pur-
chases, subscriptions, and AR markers.
4) Frontend development. Construction of the interface
with React, Vite, and Tailwind CSS, covering login,
registration, catalog, reader, author panel, and ad-
ministrator panel.
5) Authentication and role implementation. Integration
of Supabase Auth for session management and RLS
policy configuration for role-based data access con-
trol.
6) Core function development. Implementation of leg-
end creation, page editing, resource upload, review
submission, administrator approval, unique code
generation, and content unlocking.
7) Augmented reality integration. Configuration of
Unity 6 and Vuforia 11.4.4 for marker-based AR,
linking markers, scenes, and 3D models to specific
book pages.
8) Testing, adjustment, and optimization. Functional
and usability testing across all modules, with cor-
rections to data flows, permission validation, and
3D model optimization.
C. Publication Workflow
The editorial publication workflow follows a four-
state lifecycle, illustrated in Fig. 4: draft, under
review, approved/published, and rejected/changes re-
quested. This workflow is analogous to the submission-
review-publication cycle in content management systems
[10]. An author begins by registering a legend as a draft,
adding pages, images, and associated resources. When
ready, the author submits the legend for review. The
administrator evaluates the content and either approves
it—making it visible in the public catalog—rejects it, or
requests specific changes. This workflow prevents uncon-
trolled publication and maintains content quality without
requiring manual intervention in routine read operations.
With the editorial workflow in place, the following
section describes how the augmented reality component
is integrated as an external module linked to this content
lifecycle.
Fig. 4. Editorial publication workflow: draft → under review →
approved/published or rejected/changes requested.
VI. Augmented Reality Integration
A. Architecture of the AR Component
The AR experience is implemented as an externally
linked component following the technical framework pro-
posed by Azuma et al. [11], which identifies tracking,
registration, and display as the core technical concerns
of any AR system. Unity 6 serves as the development
engine for the AR application, while Vuforia Engine 11.4.4
handles image target recognition. The minimum Unity ver-
sion supported by Vuforia 11.4.4 is Unity 6000.0.38f1 LTS,
which aligns with the team’s version choice.
B. Marker Design and Content
The AR experience is activated through a custom image
marker designed specifically for the project, shown in
Fig. 5. When the user points the mobile device camera at
the marker printed in the physical book, Vuforia recognizes
the image target and Unity renders the associated 3D
content.
Fig. 5. AR image marker designed for the Leyendas de Bacalar
project.
Two 3D models are activated: a character model of el
Padre Miguel produced in ZBrush, and an architectural
model of the Parroquia de San Joaquín produced in
Autodesk Maya. Both models represent elements from
the cultural narrative with direct historical grounding in
18th-century Bacalar. Fig. 6 shows the AR experience
functioning on a mobile device.

-- 5 of 9 --

Fig. 6. Augmented reality experience: 3D model rendered over the
physical book marker using Unity 6 and Vuforia Engine 11.4.4.
C. Integration with the Web Platform
The web platform manages markers and 3D resources as
digital assets stored in Supabase Storage and referenced in
the PostgreSQL database. Each marker record is linked to
a specific legend page and an associated AR scene. The AR
application reads marker definitions that have been vali-
dated through the editorial workflow, ensuring that only
approved content triggers AR experiences. This decoupled
design allows the web platform and the AR module to
be updated independently, improving maintainability and
scalability.
D. Identified Challenges and Solutions
During testing, four main challenges were identified
and addressed: (1) low lighting—reduced marker detection
reliability, addressed by specifying high-contrast marker
design and adequate illumination guidelines; (2) marker
print quality—blurred or low-resolution prints delayed
recognition, addressed by setting minimum print resolu-
tion requirements; (3) 3D model weight—high polygon
counts affected mobile rendering performance, addressed
by optimizing models and adopting GLB/glTF formats;
and (4) camera permissions—users unaware of permis-
sion requirements could not initiate AR, addressed by
implementing explicit permission request flows before AR
activation.
VII. Case Study: Legends of Bacalar
A. The Illustrated Digital Book
The primary content case study is the illustrated digital
book Leyendas de Bacalar: Un Libro Animado — El
Cura y el tormento de los Baymen, a historical fiction
narrative produced by a student from a digital animation
undergraduate program. The book reinterprets the local
oral legend of El Cura sin Cabeza, situating it within
documented historical events: the construction of the
Fuerte de San Felipe (1725–1733) under Governor Antonio
de Figueroa y Silva, the recurring incursions of British
logwood cutters known as the Baymen, and the Segunda
Gran Expedición de Desalojo of 1754 ordered by Governor
Melchor de Navarrete.
The narrative introduces a fictional protagonist, Padre
Miguel, as the spiritual pillar of the community and the
figure behind the local legend. The story is structured
in a minimum of ten scenes, conveying suspense, tension,
and historical resonance. The book specifically highlights
heritage elements that receive limited public attention,
including the Parroquia de San Joaquín and the Canal de
los Piratas.
B. Visual Production
Illustrations were produced in Krita using a workflow
of sketch, line art, flat color, volume, lighting, and post-
processing filters, exported as JPEG at 200 PPI. The color
palette was derived from the distinctive hues of the Laguna
de los 7 Colores, using predominantly cool tones with
blue dominance. Character and scenario designs include
Padre Miguel (original design), the Baymen pirates (based
on historical references with original visual treatment),
the Fuerte de San Felipe, the Parroquia de San Joaquín,
and the Canal de los Piratas. Elements derived from
documented historical sources are clearly distinguished
from original creative content.
C. Platform Integration
Fig. 7 shows the deployed platform as it appears on
desktop. The book is registered as a legend with associated
pages, illustrations, and AR resources. Cover and banner
images are stored in Supabase Storage and displayed in
the public catalog. Each illustrated page is stored as a
numbered record linked to the legend. The AR marker and
3D model files are registered as digital resources associated
with specific pages, completing the integration between
visual narrative content and the AR experience.
The functional integration of the illustrated book within
the platform provides the context for the testing and
results reported in the following section.

-- 6 of 9 --

Fig. 7. Deployed web platform displaying the Leyendas de Bacalar
legend in the public catalog (desktop view).
Fig. 8. Web platform on mobile device (responsive view).
VIII. Testing and Results
Twenty functional tests were conducted covering au-
thentication, role-based access control, catalog visual-
ization, legend management, editorial workflow, content
unlocking, AR marker recognition, 3D model rendering,
responsive layout, and general navigation.
Core implemented and functionally tested: registration;
login and role-based redirection; protected route enforce-
ment via RLS; catalog display with empty state validation;
author request and administrator approval flow; legend
creation and draft management; review submission with
minimum data validation; administrative approval and
publication state transition; unique code generation and
redemption; AR marker recognition.
Pending refinements: digital reader page-transition UX;
3D asset weight optimization for mobile devices; re-
sponsive layout adjustments on small screens; extended
evaluation with external users.
Table IV summarizes the results of selected tests and
the corrective actions applied.
TABLE IV
Selected Test Results
Test Result Issue Correction
User
registration
Passed None —
Login and role
redirect
Passed Initial redi-
rect failed
Session
validation
adjusted
Role-based ac-
cess (RLS)
Passed Direct URL
bypassed UI
guards
RLS and
protected
routes
implemented
Catalog display Passed Empty
cards on no
content
Empty state
validation
added
Legend
creation
Passed w.
adj.
Legend not
saved on
missing
fields
Flow:
general
data first,
then pages
Review
submission
Passed w.
adj.
Incomplete
content
submittable
Minimum
data
validation
added
AR marker
recognition
Passed w.
obs.
Slow recog-
nition in low
light
High-
contrast
marker
guidelines
issued
3D model ren-
dering
Under opti-
mization
Heavy
models
affect
mobile
perf.
GLB format
and polygon
reduction
adopted
Digital reader
nav.
UX refine-
ment pend-
ing
Page
transition
UX requires
improve-
ment
Sequential
page
numbering
implemented
Responsive lay-
out
UX refine-
ment pend-
ing
Overflow
on small
screens
Tailwind
responsive
classes
adjusted
Out of 20 functional tests, 13 were successfully com-
pleted or completed after minor adjustments, while 7 cor-
respond to optimization or interface refinement tasks. No
critical failures were detected in authentication, role-based
access control, database integrity, or content publication
flow. The core architecture of the deployed prototype
functions correctly across all primary user journeys.
IX. Discussion
A. Architectural Feasibility
The adoption of Supabase as a BaaS layer proved
effective for a first deployed version of the system. By
centralizing authentication, storage, RLS policies, and
RPC functions in a single managed platform, the team
reduced initial development complexity and avoided the
overhead of maintaining a separate server. This aligns
with patterns observed in adaptive web architectures for

-- 7 of 9 --

educational systems [6], where modular, service-oriented
designs support scalability without requiring complete re-
engineering of the core system. The RLS policy model
[13] proved particularly valuable during testing: attempts
to access protected routes via direct URL were blocked
at the database level even when frontend route guards
were bypassed, demonstrating the importance of enforcing
access control at multiple architectural layers [9].
B. Editorial Workflow as a Replicable Pattern
The four-state publication workflow—draft, under re-
view, published, rejected/changes requested—proved ad-
equate for maintaining content quality without constant
administrative intervention in read operations. This pat-
tern, analogous to academic publishing workflows [10],
is replicable for other cultural content platforms where
community-generated narratives require editorial vali-
dation before public dissemination. The workflow also
demonstrated that separating the author request approval
step from the legend submission step reduces the adminis-
trative burden: not every registered user generates content
that requires review.
C. Decoupled AR Integration
Treating the AR component as an externally linked
module produced a maintainable architecture where the
web platform and the AR application can evolve inde-
pendently. This separation also provides a clear upgrade
path: the AR component could be migrated to a WebAR
approach using 8th Wall or AR.js without modifying the
platform’s core data model or editorial workflow. The
web platform controls and organizes; the AR application
recognizes and renders, following the tracking-registration-
display framework formalized by Azuma et al. [11].
D. Scalability and Cultural Applicability
The platform architecture does not depend on a single
cultural narrative. Any new legend can be registered as a
new entry with its own pages, illustrations, AR markers,
and 3D models, without modifying the existing database
schema or frontend components. This scalability is a direct
consequence of the normalized relational data model and
the component-based frontend [14]. The same architecture
could be applied to other municipalities in the Yucatán
Peninsula or other regions with documented oral heritage,
converting the platform into a replicable infrastructure for
regional cultural heritage digitization.
E. Interdisciplinary Development Model
The project was developed by students from software
development and digital animation undergraduate pro-
grams. This model aligns with the co-creation and iterative
refinement patterns documented by Zhang and Peng [7],
where combining technical and creative expertise produces
richer cultural heritage digital experiences than either
discipline could achieve independently. The illustrated
book and the web platform are not parallel products: they
are components of a single integrated system, where the
narrative content serves as a functional validation of the
platform’s architecture.
X. Conclusions and Future Work
This paper presented the design, development, and
functional deployment of a web platform for publishing
and visualizing interactive digital books with augmented
reality, applied to cultural narratives of Bacalar, Quintana
Roo, Mexico. The implemented prototype demonstrates
that a web-based architecture combining role-based access
control, structured editorial workflows, relational content
management, and a decoupled AR integration is feasible
for disseminating cultural heritage narratives through
interactive digital books.
The architecture based on React, Supabase, and Post-
greSQL with row-level security was deployed as a func-
tional prototype (URL omitted for blind review). Twenty
functional tests confirmed the correct operation of authen-
tication, role-based access, catalog management, editorial
workflow, and AR marker recognition. Pending improve-
ments are concentrated in digital reader UX transitions,
3D model weight optimization for mobile devices, and
responsive layout refinement on small screens—all of
which correspond to optimization tasks in an otherwise
operational system.
The illustrated digital book Leyendas de Bacalar vali-
dated the complete content lifecycle of the platform, from
authoring to publication and AR activation, using histor-
ically grounded cultural content from Bacalar, Quintana
Roo.
Future work includes: (1) migration of the AR compo-
nent to a WebAR approach to eliminate the need for a
separate mobile application; (2) development of a React
Native companion app for enhanced AR capabilities on
Android; (3) integration of additional Bacalar legends
and expansion toward other cultural destinations in the
Yucatán Peninsula; (4) formal usability evaluation using
the System Usability Scale (SUS) and the Augmented
Reality Presence Scale (ARPS) [4]; and (5) exploration
of AI-assisted content review to support editorial quality
control at scale.
References
[1] R. Wang, “Application of Augmented Reality Technology in
Children’s Picture Books Based on Educational Psychology,”
Frontiers in Psychology, vol. 13, Art. no. 782958, 2022, doi:
10.3389/fpsyg.2022.782958.
[2] R. G. Boboc, E. Băutu, F. Gîrbacia, N. Popovici, and D.-
M. Popovici, “Augmented Reality in Cultural Heritage: An
Overview of the Last Decade of Applications,” Applied Sciences,
vol. 12, no. 19, Art. no. 9859, 2022, doi: 10.3390/app12199859.
[3] D. Shidende and S. Moebs, “Integrating Design-Based Research
and Agile Scrum for Inclusive Educational Technology Design,”
Multimedia, vol. 1, Art. no. 6, 2025, doi: 10.3390/multime-
dia1020006.
[4] E. Gandolfi and R. E. Ferdig, “Exploring the relationship
between motivation and augmented reality presence using the
augmented reality presence scale (ARPS),” Education Tech
Research Dev, vol. 73, pp. 793–814, 2025, doi: 10.1007/s11423-
025-10446-5.

-- 8 of 9 --

[5] K. Alhamad, A. Manches, and S. McGeown, “Augmented reality
books: in-depth insights into children’s reading engagement,”
Frontiers in Psychology, vol. 15, Art. no. 1423163, 2024, doi:
10.3389/fpsyg.2024.1423163.
[6] A. A. Quartulli, G. Mignogna, V. Zizzo, and M. Mongiello,
“Adaptive Architectures for Gamified Learning in Software
Engineering: A Systematic Review,” Computers, vol. 15, no. 4,
Art. no. 235, 2026, doi: 10.3390/computers15040235.
[7] J. Zhang and F. Peng, “Co-Creation of Immersive Learning
for Cultural Heritage Education: A Scoping Review,” Heritage,
vol. 9, no. 5, Art. no. 192, 2026, doi: 10.3390/heritage9050192.
[8] J. P. Cazar Puruncajas, S. M. Imbaquingo Maigua, and Á.
A. Zambrano Carranza, Realidad Aumentada (AR). Ecuador:
Ediciones Ecuafuturo, 2023, ISBN: 978-9942-780-42-3.
[9] R. S. Sandhu, E. J. Coyne, H. L. Feinstein, and C. E. Youman,
“Role-Based Access Control Models,” Computer, vol. 29, no. 2,
pp. 38–47, 1996, doi: 10.1109/2.485845.
[10] J. Willinsky, “Open Journal Systems: An example of open
source software for journal management and publishing,”
Library Hi Tech, vol. 23, no. 4, pp. 504–519, 2005, doi:
10.1108/07378830510636300.
[11] R. Azuma, Y. Baillot, R. Behringer, S. Feiner, S. Julier, and
B. MacIntyre, “Recent Advances in Augmented Reality,” IEEE
Computer Graphics and Applications, vol. 21, no. 6, pp. 34–47,
2001, doi: 10.1109/38.963459.
[12] Supabase, “Supabase Documentation,” 2026. [Online]. Avail-
able: https://supabase.com/docs
[13] PostgreSQL Global Development Group, “Row Security
Policies,” PostgreSQL Documentation, 2026. [Online].
Available: https://www.postgresql.org/docs/current/ddl-
rowsecurity.html
[14] React Team, “Quick Start — React,” 2026. [Online]. Available:
https://react.dev/learn

-- 9 of 9 --', 'completed', NULL, '2026-07-14 04:52:54.547115+00')
on conflict do nothing;

-- ========== document_render_pages ==========
INSERT INTO public.document_render_pages (id, source_document_id, legend_id, version_id, page_number, image_asset_id, thumbnail_asset_id, width, height, render_format, render_scale, status, error_message, metadata, created_at, updated_at) VALUES ('487aeaf1-6c88-456a-a4da-93845356fdc6', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '1', '6e1a58ce-f8c3-477b-9002-42fac7283b69', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-001.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:50.270492+00', '2026-06-29 14:21:50.270492+00'),
('f4812b9a-94fa-4d5d-89a7-5acfd591ffed', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '2', 'adcc2464-a4bf-4789-8c6d-7c9843b3554f', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-002.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:50.90281+00', '2026-06-29 14:21:50.90281+00'),
('afdd0816-b5c2-4bab-aafc-12a0e9e627ea', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '3', 'd1875049-c0fe-40dd-8c77-1e59d3f69b36', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-003.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:51.460873+00', '2026-06-29 14:21:51.460873+00'),
('957df26b-a1c0-4091-8e9d-74c68aee6c8b', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '4', '96ec27a5-ea94-4971-ac1e-f6a62e6fcbb0', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-004.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:52.025631+00', '2026-06-29 14:21:52.025631+00'),
('15898d53-8f9a-4caf-a58d-e21ded687b73', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '5', '56c93bc8-b85f-4d09-963b-b1a3146e80f5', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-005.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:52.587149+00', '2026-06-29 14:21:52.587149+00'),
('1ae700aa-0b8c-4c8a-a81a-b6d6eb47f13d', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '6', '15ba0d58-8096-4459-abd8-2d9eaca82c1e', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-006.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:53.035726+00', '2026-06-29 14:21:53.035726+00'),
('4044247e-91db-41f4-ad36-4ef578dcb464', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '7', 'c3ad3b2b-2277-4b2d-ac45-0fbb8270cc4b', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-007.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:53.519788+00', '2026-06-29 14:21:53.519788+00'),
('0766f84d-0131-41ed-9d5a-084f316828f4', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '8', '863ea0dc-c5f2-4031-9cab-44f47c9ed308', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-008.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:54.029126+00', '2026-06-29 14:21:54.029126+00'),
('919b2f97-3e85-4706-9cfd-83d4239c629d', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '9', '263a382f-efa7-4741-b1b9-c35a0c0937f3', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-009.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:54.464081+00', '2026-06-29 14:21:54.464081+00'),
('aa463c7c-6a93-4bcb-8079-021dcc01b7ae', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '10', '333cec87-4066-4244-9020-86b8c306e2f1', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-010.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:55.002184+00', '2026-06-29 14:21:55.002184+00'),
('cfd9a9bb-bf1a-471f-b40f-23c649c7a925', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '3', '1424b429-5e49-4080-b403-589f7e4d748c', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-003.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:14.977932+00', '2026-06-12 22:19:17.832418+00'),
('03f5421b-5c75-4a0f-bf2a-94d4f688021d', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '4', 'a9da9a15-2b4b-40fb-881a-ab94e5d0ba5c', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-004.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:15.401885+00', '2026-06-12 22:19:18.49602+00'),
('5322ee09-b858-44cf-8dee-5d2a3fc16074', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '5', 'b1d3f992-377d-4ac9-94fa-a57766c960cc', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-005.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:15.790512+00', '2026-06-12 22:19:19.04142+00'),
('53e8a823-ca68-4d0b-9671-1d3c988303f4', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '6', '1d780584-6fca-47bb-a042-f94988caf6c8', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-006.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:16.241555+00', '2026-06-12 22:19:19.639057+00'),
('b1b8fa99-ebd9-42a6-b991-c01c461f55b0', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '7', 'f69793e6-2609-4fe9-8d28-5773a9bfabff', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-007.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:16.949879+00', '2026-06-12 22:19:20.263972+00'),
('923b36b8-da89-42d3-a0d1-383bcbe8ec8a', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '8', '34a4572b-d3f5-47b3-9c1e-4b310f037beb', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-008.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:17.295086+00', '2026-06-12 22:19:20.793847+00'),
('f12a785d-48d3-418c-990e-701d4f00d27e', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '1', '00937b84-6ce6-4f18-928f-da6bf2d4db72', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-001.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:13.908864+00', '2026-06-12 22:19:16.584219+00'),
('e862aad7-b6f0-4d69-a4ab-76af4f3370a8', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, '2', 'd8317b8e-e826-4af5-8976-c8776b72a371', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ea8e9c28-e0c7-416c-8a23-0819ba9897d1/versions/source-57108ec7-8ba4-46c6-a2ac-0c636a99d6aa/rendered-pages/page-002.jpg", "source_asset_id": "ae5bc837-af47-4f1f-955c-12d23d31219e"}', '2026-06-12 22:16:14.206283+00', '2026-06-12 22:19:17.041+00'),
('6f10c130-5157-46d0-a36c-6ae66dd7b0c9', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '11', 'b5db6d3e-0b9b-46e3-9c45-81beae2f2617', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-011.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:55.529844+00', '2026-06-29 14:21:55.529844+00'),
('6d371f52-86e3-4d0b-98ac-c273a31a4e33', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '14', '410aadef-a310-41b1-9533-93fc267c235e', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-014.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:56.951998+00', '2026-06-29 14:21:56.951998+00'),
('c397541c-4679-4b8e-9638-1f97b4771fe8', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '17', 'd213a9fd-e140-452f-abbc-0485aa44feea', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-017.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:58.503378+00', '2026-06-29 14:21:58.503378+00'),
('fc735575-2236-455f-9a6e-5bd468a29fd2', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '20', 'f210d7c3-09de-4246-bf8d-c083d4c04f30', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-020.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:00.462978+00', '2026-06-29 14:22:00.462978+00'),
('ca5aaeaa-c0fb-41bf-961b-ebccaf7e52a8', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '23', '298c2dbc-8591-43b5-8754-b5d9ac7ec6e8', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-023.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:01.921733+00', '2026-06-29 14:22:01.921733+00'),
('c6b203d5-bfb5-4006-95d4-f0d35f14bcc6', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '26', '897d329a-f4a1-454d-a937-3ed783b11054', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-026.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:03.276199+00', '2026-06-29 14:22:03.276199+00'),
('cca8a100-5178-460f-8f87-86a18ee7bb49', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '29', '498d1e9d-e683-4dfd-a471-73499d7d185f', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-029.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:04.696639+00', '2026-06-29 14:22:04.696639+00'),
('a80bfec1-42f1-4e68-9b8b-cdcc0a973ce5', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '32', 'f6a9998b-79e0-425c-942d-7f42d01d287f', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-032.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:06.301388+00', '2026-06-29 14:22:06.301388+00'),
('f2b70409-f19a-440b-9936-790e2cf49800', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '12', '3dac93bd-dd1e-49d2-9ec9-53582a40f3c3', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-012.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:55.976641+00', '2026-06-29 14:21:55.976641+00'),
('252afee0-77fd-4665-a485-5f4c07cf056a', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '15', 'a59195a0-deec-4555-be44-2d8b6fdc9f99', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-015.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:57.384578+00', '2026-06-29 14:21:57.384578+00'),
('9414e9ad-bdf4-4049-9e93-fe42dc08a63e', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '18', '61fe0ebd-53cb-44bd-af3d-503ff89674d5', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-018.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:59.278002+00', '2026-06-29 14:21:59.278002+00'),
('d755c66f-490f-4729-998a-03847fca5c24', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '21', '71a8fa7d-0ad1-4c49-ac86-d36f9c00ec11', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-021.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:00.989684+00', '2026-06-29 14:22:00.989684+00'),
('ef2a4826-e8ce-448d-961c-0a01c5da6571', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '24', 'dba86a53-da81-47ff-ac3f-3951506d07fa', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-024.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:02.348861+00', '2026-06-29 14:22:02.348861+00'),
('ad4fa86d-7f23-426b-aec8-fc02373e581e', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '27', 'a1171a26-bc33-4b7c-bcee-4d456cf9aac6', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-027.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:03.741075+00', '2026-06-29 14:22:03.741075+00'),
('074d381a-c2ae-485e-81af-934b17bbc91e', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '30', '95f2beb9-3a7d-4ee2-b920-ea56b1b9c5f9', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-030.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:05.286077+00', '2026-06-29 14:22:05.286077+00'),
('a74209a9-a968-4614-ae25-ea1bdac99f59', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '13', 'c9ba0f66-524b-45ef-a5ae-6d904fa7cd4e', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-013.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:56.501586+00', '2026-06-29 14:21:56.501586+00'),
('ea061c61-5bf2-4a2f-9710-69b852213cbc', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '16', 'c05d0d40-bdd6-46a6-96f6-9bfffce424a1', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-016.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:57.960063+00', '2026-06-29 14:21:57.960063+00'),
('b63231ed-83e3-4638-92ce-6a18341458b7', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '19', 'a5cd55eb-c0ae-48c6-aeb7-592ab72d7f4a', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-019.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:21:59.891851+00', '2026-06-29 14:21:59.891851+00'),
('a195886c-aebb-4001-b646-c9e13a06c2f7', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '22', '48e07b97-a9d0-44f5-ba0d-4ddfa20e7253', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-022.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:01.430135+00', '2026-06-29 14:22:01.430135+00'),
('7cb016dc-121e-4dc5-9999-2eb4b841022b', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '25', '74f40c05-667b-4bd8-88b8-b74fefc4bad8', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-025.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:02.800535+00', '2026-06-29 14:22:02.800535+00'),
('0d25ad37-0345-4978-b0f0-72e3137cf76f', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '28', '6c69cb3e-371a-4342-b72a-3d1e9366b266', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-028.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:04.259872+00', '2026-06-29 14:22:04.259872+00'),
('fc7af1ed-a9b4-4e17-b29f-c84f01b1e959', '60b51612-781c-405f-a22c-4614254ae93c', 'ddf1014f-1b3b-4d5c-aa24-bc22001f3670', NULL, '31', 'cb47e009-9bc5-4486-977f-8e05c70d6f96', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/ddf1014f-1b3b-4d5c-aa24-bc22001f3670/versions/source-60b51612-781c-405f-a22c-4614254ae93c/rendered-pages/page-031.jpg", "source_asset_id": "deb9adaf-0f93-48b2-9b9d-1755207d2000"}', '2026-06-29 14:22:05.766518+00', '2026-06-29 14:22:05.766518+00'),
('8e5802d2-f036-48d1-9bca-241f54f88744', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '1', 'b73aa6cd-676d-4cae-922d-4e9e4e06eb45', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-001.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:30.200099+00', '2026-07-14 03:11:30.200099+00'),
('c864f4c5-13ee-43d7-96e2-db35d2a6467c', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '2', 'fc75e826-a47c-4e7d-beb6-336c7ce414aa', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-002.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:30.459022+00', '2026-07-14 03:11:30.459022+00'),
('b5424bea-9590-4cbf-ab91-e15dc3f21379', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '3', '98e16986-2eae-4bf8-acf2-275f0dec5047', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-003.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:30.781826+00', '2026-07-14 03:11:30.781826+00'),
('ae1d272e-56ac-4684-b133-5375ccc523a5', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '4', 'bb86b6e9-b94d-4729-bee8-a38aec6c46d6', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-004.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:31.0077+00', '2026-07-14 03:11:31.0077+00'),
('0128d41c-cfe9-4dcb-9277-aa6e6984d3b4', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '5', '7c73d932-8ed4-40cc-b482-8cf79fadd570', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-005.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:31.234013+00', '2026-07-14 03:11:31.234013+00'),
('ecc68e11-8d43-404d-b537-78e4a39c6f97', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '6', '912dc3f5-650f-4747-b18a-aa3bb06306d4', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-006.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:32.237059+00', '2026-07-14 03:11:32.237059+00'),
('4d99417a-3dc1-4b51-9300-6a65413ed63b', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '7', '9cc80f37-6f49-45a0-865b-4acaf3b2bff5', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-007.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:32.545884+00', '2026-07-14 03:11:32.545884+00'),
('d13542b3-081a-4301-b7ee-05ab5dd91cf1', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '8', '79ce8ebd-4e27-422b-8999-fc21107f7983', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-008.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:32.841262+00', '2026-07-14 03:11:32.841262+00'),
('599e6b22-32e8-4628-8157-f18eb14d012d', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, '9', 'dc13efff-7c67-4a97-8488-57a372fca65d', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/15b22816-585d-4d33-9270-eb7a280223e0/versions/source-fe3fd63c-e2f1-4545-bb18-32c47d37678f/rendered-pages/page-009.jpg", "source_asset_id": "d6d000b2-215d-45b0-93f7-84d96a887772"}', '2026-07-14 03:11:33.062882+00', '2026-07-14 03:11:33.062882+00'),
('c2a136cf-afb9-4b8c-8d4d-75eab4d8f55c', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '1', '6550455a-3fdb-4f8a-9a48-2c71f387cd7c', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-001.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:43.451353+00', '2026-07-14 04:52:43.451353+00'),
('ad3df26c-9746-414e-9b21-f0c4ebb1bc8c', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '2', '7340c7f0-721d-45ad-882e-bc6e77d8ace3', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-002.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:43.75754+00', '2026-07-14 04:52:43.75754+00'),
('d081aece-f7ee-4c6c-a009-0c15f88c3223', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '3', '96853941-9a49-4ff1-a337-be3fd08653fa', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-003.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:44.307744+00', '2026-07-14 04:52:44.307744+00'),
('a11aff0d-8f53-4664-b467-c9ce5b143037', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '6', '74656bf7-7ebb-40de-9452-90d98b2eab6b', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-006.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:45.436014+00', '2026-07-14 04:52:45.436014+00'),
('b10019e2-4ea6-4f27-b822-0b5548d64ca7', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '9', '9302e024-5e39-4709-aa8c-9f2d94d0b8da', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-009.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:46.91586+00', '2026-07-14 04:52:46.91586+00'),
('5a8b5051-9ff4-4f06-a2a4-9b60aa1026c0', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '4', '426ab3c5-a814-4611-9ce5-106db937b78c', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-004.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:44.681224+00', '2026-07-14 04:52:44.681224+00'),
('c99d6489-4354-448a-941d-61711fbff44f', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '7', '6362a998-b08f-449c-87c8-018857bd9a6c', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-007.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:46.346623+00', '2026-07-14 04:52:46.346623+00'),
('5f2e51b2-7ab4-4842-86b6-b540e73dae35', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '5', '96fd7068-1a0a-4e21-8f86-651a64885bf5', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-005.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:45.148261+00', '2026-07-14 04:52:45.148261+00'),
('c699ff11-6344-4692-a1f2-aaf9f2b617fc', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, '8', 'dd63f267-1549-4970-9b9f-047bd9e8c224', NULL, '918', '1188', 'jpg', '1.5', 'ready', NULL, '{"bucket": "legend-documents", "rendered_by": "2f412137-0da6-4865-bf6d-dc121c54beb5", "storage_path": "legends/c9212d58-78d3-46a3-be78-575721fdd6c3/versions/source-b5dd93f6-2663-42e0-9de6-dae298e8f79a/rendered-pages/page-008.jpg", "source_asset_id": "87c7272e-02f0-4776-a1e8-cb9b53a4b30e"}', '2026-07-14 04:52:46.664339+00', '2026-07-14 04:52:46.664339+00')
on conflict do nothing;

-- ========== ar_scenes ==========
INSERT INTO public.ar_scenes (id, page_id, name, description, model_asset_id, scale, position, rotation, interaction_config, status, created_by, created_at, updated_at) VALUES ('81ea7290-9d2d-47fd-a9d6-64c49a15883e', '76c9004d-ecc8-4c19-836b-7fb0935fda06', 'Escena AR de leyenda', 'Escena AR vinculada a leyenda ea8e9c28-e0c7-416c-8a23-0819ba9897d1', '9374b039-b97c-488c-b682-08f1734df288', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'active', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-12 17:32:38.370174+00', '2026-06-15 03:43:16.235763+00'),
('cf4a2a04-26a4-4312-b2a2-23dc58bdcac6', NULL, 'El sismite.glb', NULL, 'cc69051a-f591-4512-b3e8-1b5bda553a19', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 12:25:55.65439+00', '2026-06-15 12:25:55.65439+00'),
('5aebc45c-b13f-4b6a-a467-45bee2dc0b6a', NULL, 'El sismite.glb', NULL, '96cb96ee-753f-4a1b-b094-012a3806ba13', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 12:29:01.514337+00', '2026-06-15 12:29:01.514337+00'),
('bd947300-cb59-4107-a082-3880347c2295', NULL, 'El sismite.glb', NULL, 'b2b015e0-a193-42f2-9427-2cf374f0c034', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 12:46:44.448609+00', '2026-06-15 12:46:44.448609+00'),
('38ff8230-7b1c-4ddc-94e3-94c796a0fbe8', NULL, 'El sismite.glb', NULL, '952baa24-cfd9-4c84-98a3-a46b142a63cf', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 12:49:23.056999+00', '2026-06-15 12:49:23.056999+00'),
('b16c2098-414a-4052-97b1-c1a93dc63b56', NULL, 'El sismite.glb', NULL, '17b5fb97-e5ed-4f66-a13a-635032acb091', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 12:51:45.27196+00', '2026-06-15 12:51:45.27196+00'),
('faf87de8-a4e2-4825-b655-23b04b9debac', NULL, 'El sismite.glb', NULL, '77733ec5-2da5-4900-abf4-2307096366ba', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-15 14:00:02.040231+00', '2026-06-15 14:00:02.040231+00'),
('8a6aabca-c1ab-45e4-8f0b-82d4eb7f0197', NULL, 'El sismite.glb', NULL, '7d9d3c49-b2cc-4050-9a88-94021f2d59fb', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-17 16:23:30.876514+00', '2026-06-17 16:23:30.876514+00'),
('c27ab46b-274a-4e29-95d7-8917d8c47f27', NULL, 'El sismite.glb', NULL, 'f1fe2237-d935-4260-a2c2-e706c51074bb', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-17 16:24:43.857783+00', '2026-06-17 16:24:43.857783+00'),
('07ba03f0-1518-4c14-b4e5-9481ee48fb8c', NULL, 'El sismite.glb', NULL, '3624b79c-d0d7-4566-a5a0-f2ae2ddb2f28', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-17 17:19:38.847834+00', '2026-06-17 17:19:38.847834+00'),
('d23401fb-a708-45b1-9a49-d753c29616f1', NULL, '51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, '3c687854-166b-49be-a09b-95c1e77f3a21', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-18 16:49:10.491013+00', '2026-06-18 16:49:10.491013+00'),
('9602a419-01bc-45bf-80f8-adb6e0366a77', NULL, '6ff0c527-a500-410c-ada0-abb8393c2680.glb', NULL, 'ab084bd5-1341-4102-9463-ad0fd811f06f', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-18 16:49:57.97206+00', '2026-06-18 16:49:57.97206+00'),
('2521da37-6802-486f-831b-6b7c64089655', NULL, 'ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', NULL, '0b1545d3-f839-44a5-b988-279e2b70a0e8', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-18 16:50:29.286942+00', '2026-06-18 16:50:29.286942+00'),
('10e640ed-d12d-4cb9-a92f-45858b2caf56', '918a3bc1-146a-41df-be34-06ae22d58b10', '6ff0c527-a500-410c-ada0-abb8393c2680.glb', NULL, '58ad8e05-7997-4173-b5fe-bd0bd5f8a9e9', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-20 16:47:23.78465+00', '2026-06-20 16:47:23.78465+00'),
('642f1b0d-8802-4078-91a1-6f8dd66f2064', NULL, '51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, '3edbe1c9-6804-455f-9c30-f621b797030d', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-29 14:23:24.311012+00', '2026-06-29 14:23:24.311012+00'),
('40ef8736-f494-44b6-9a7f-3dd285774413', 'eade30e3-feab-4143-b9a8-930ba6feb57e', 'upb_real.glb', NULL, '598ef6fe-b12f-492f-bf24-c66fd08eefde', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-08 05:24:00.031918+00', '2026-07-08 05:24:00.031918+00'),
('9c5dc9ec-bc0f-4172-b3ee-af79f6f2ae9b', '8003fb72-f5ef-409b-bd2e-fd2af1d5cd42', 'ad8fbd4d-3f32-4394-927e-eb1f791034f4.glb', NULL, '0cd4a6dd-109e-42d5-841a-bcca5e6f95ea', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-13 14:17:28.239779+00', '2026-07-13 14:17:28.239779+00'),
('f90f98fd-b1b7-453f-8900-2fd9cb3d2469', 'eed5d74b-51be-4cd0-8342-d21942d369c6', 'a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', NULL, 'd7ce1c05-8f41-41ad-9d37-d6946d7439ca', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-13 14:21:35.783321+00', '2026-07-13 14:21:35.783321+00'),
('04ba6d5f-f366-47ea-bf33-ebc5b5467b1f', NULL, '51b75da2-c565-4251-b6e9-345fa3db2355.glb', NULL, 'd7ba134d-5359-4197-a23e-97b751ec77b9', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-14 04:44:54.765138+00', '2026-07-14 04:44:54.765138+00'),
('cf4eb222-724b-4b94-825f-c1eda35d5289', NULL, 'a9fc61b0-3ab7-44f3-b3da-45dc3104369b.glb', NULL, '038c5499-1229-406e-a8cc-27858867a01f', '{"x": 1, "y": 1, "z": 1}', '{"x": 0, "y": 0, "z": 0}', '{"x": 0, "y": 0, "z": 0}', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-14 20:03:04.116015+00', '2026-07-14 20:03:04.116015+00')
on conflict do nothing;

-- ========== code_batches ==========
INSERT INTO public.code_batches (id, edition_id, code_request_id, prefix, quantity, status, generated_by, notes, created_at, updated_at) VALUES ('9595f8a6-dab6-420b-a416-2aa08dd93746', 'a66d7f5b-13e3-437e-947d-54b703351e36', '4b6b577f-cf4a-4f8c-bf3e-5da36103f55d', 'LEYEND', '2', 'generated', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'Generado por el autor', '2026-07-13 14:14:18.148608+00', '2026-07-13 14:14:18.148608+00'),
('74aa1fdf-7186-40ad-8056-af5f96d0901d', 'a66d7f5b-13e3-437e-947d-54b703351e36', '750b1360-5e1d-4743-9160-35784d3b62e1', 'LEGEND12', '2', 'generated', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'Generado por el autor', '2026-07-13 14:19:12.809571+00', '2026-07-13 14:19:12.809571+00')
on conflict do nothing;

-- ========== subscription_plans ==========
INSERT INTO public.subscription_plans (id, product_id, name, description, price, currency, duration_days, status, created_at, updated_at) VALUES ('548ac229-2484-405b-a800-f1099c5dd17b', '46e2dc11-6eb2-4586-a363-892b6a814fca', 'Plan Cultural Mensual', 'Acceso simulado por 30 días a contenido premium de Leyendas de Bacalar.', '49.00', 'MXN', '30', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00'),
('c2e43566-8cc9-4fd5-9900-9afdb0731e57', '22857d46-095e-4cc4-a592-8950766a3edc', 'Plan Escolar Trimestral', 'Acceso simulado por 90 días para mostrar el modelo de suscripción del proyecto.', '129.00', 'MXN', '90', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00'),
('c20552a3-7fef-42b4-924e-f5fcac7b08b9', '4efe495c-aeaf-43dc-b40e-a06b15f931bb', 'Plan Cultural Anual', 'Acceso simulado por 365 días a contenido premium de la plataforma.', '399.00', 'MXN', '365', 'active', '2026-05-24 22:52:52.714303+00', '2026-05-24 22:52:52.714303+00')
on conflict do nothing;

-- ========== ar_markers ==========
INSERT INTO public.ar_markers (id, marker_code, marker_asset_id, ar_scene_id, marker_type, status, created_by, approved_by, approved_at, created_at, updated_at) VALUES ('f2da13bf-3359-4188-b2a4-43adb10fec1c', 'marker-ea8e9c28-e0c7-416c-8a23-0819ba9897d1-1781285614664', '75e83674-9786-4c71-938c-2081b822765d', '81ea7290-9d2d-47fd-a9d6-64c49a15883e', 'image_marker', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, '2026-06-12 17:33:35.833211+00', '2026-06-12 17:33:35.833211+00')
on conflict do nothing;

-- ========== interactive_hotspots ==========
INSERT INTO public.interactive_hotspots (id, legend_id, version_id, target_type, source_document_id, source_page_number, page_id, hotspot_type, marker_asset_id, ar_scene_id, label, description, x, y, width, height, metadata, status, created_by, created_at, updated_at) VALUES ('85e77b09-03e6-432a-857c-b2b3b40e7b66', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, 'source_document', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', '1', NULL, 'marker', '75e83674-9786-4c71-938c-2081b822765d', '81ea7290-9d2d-47fd-a9d6-64c49a15883e', NULL, NULL, '0.46752410839608244', '0.6964285714285714', '0.085', '0.085', '{}', 'published', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-12 17:29:28.188182+00', '2026-06-15 03:41:57.759172+00'),
('4f20043e-0550-445d-aa9a-09ebaff73119', 'ea8e9c28-e0c7-416c-8a23-0819ba9897d1', NULL, 'source_document', '57108ec7-8ba4-46c6-a2ac-0c636a99d6aa', '7', NULL, 'marker', '75e83674-9786-4c71-938c-2081b822765d', '81ea7290-9d2d-47fd-a9d6-64c49a15883e', NULL, NULL, '0.47154340100058406', '0.6803571428571429', '0.085', '0.085', '{}', 'published', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-06-12 17:30:11.308308+00', '2026-06-15 03:41:57.759172+00'),
('a1f51b64-4060-4505-9309-7eb700c14713', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, 'source_document', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', '1', NULL, 'marker', '0307397f-7596-476e-8724-6a3ab311098e', 'cf4eb222-724b-4b94-825f-c1eda35d5289', 'WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg', NULL, '0.5076316030401932', '0.5541674237688123', '0.46', '0.32910898197439087', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-14 20:02:24.802377+00', '2026-07-14 20:03:36.922529+00'),
('1ca01d7f-712a-4fe0-95bf-ace4aa599424', 'c9212d58-78d3-46a3-be78-575721fdd6c3', NULL, 'source_document', 'b5dd93f6-2663-42e0-9de6-dae298e8f79a', '3', NULL, 'marker', '0307397f-7596-476e-8724-6a3ab311098e', 'cf4eb222-724b-4b94-825f-c1eda35d5289', 'WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg', NULL, '0.5206141788274739', '0.41060238599140303', '0.4045614122441814', '0.39092957259733774', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-14 20:04:01.37075+00', '2026-07-14 20:06:00.395655+00'),
('bfaac1ba-da27-4fc0-8857-cd06a9b74ee3', '15b22816-585d-4d33-9270-eb7a280223e0', NULL, 'source_document', 'fe3fd63c-e2f1-4545-bb18-32c47d37678f', '1', NULL, 'marker', '9902d380-fdaa-424f-b350-80b382c595c6', '04ba6d5f-f366-47ea-bf33-ebc5b5467b1f', 'WhatsApp Image 2026-07-02 at 8.18.26 PM.jpeg', NULL, '0.5047367848314288', '0.633880864855141', '0.3410539959204085', '0.2672920658900768', '{}', 'draft', '2f412137-0da6-4865-bf6d-dc121c54beb5', '2026-07-14 04:45:53.934755+00', '2026-07-14 04:46:14.886635+00')
on conflict do nothing;

-- ========== access_codes ==========
INSERT INTO public.access_codes (id, batch_id, edition_id, code_hash, display_code, prefix, status, generated_by, assigned_to_user_id, assigned_at, expires_at, created_at, updated_at) VALUES ('caae3481-9d23-441f-b838-376f7ef4d8db', '9595f8a6-dab6-420b-a416-2aa08dd93746', 'a66d7f5b-13e3-437e-947d-54b703351e36', '6904aadc1009f59873790a8e9886d57de2ce63b2078e2698484a3b4047155226', 'LEYEND-WJ8D-YZL9D', 'LEYEND', 'redeemed', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '2026-07-13 14:23:25.434529+00', NULL, '2026-07-13 14:14:18.148608+00', '2026-07-13 14:23:25.434529+00'),
('6f603f66-b20e-450e-9fbe-4a5becc4fcec', '9595f8a6-dab6-420b-a416-2aa08dd93746', 'a66d7f5b-13e3-437e-947d-54b703351e36', '95af0fee9c969faa7aa00c3809ccee13ca93193848be9314b7d0364635a92acf', 'LEYEND-SWMS-2UNK2', 'LEYEND', 'redeemed', '2f412137-0da6-4865-bf6d-dc121c54beb5', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '2026-07-13 14:14:58.659915+00', NULL, '2026-07-13 14:14:18.148608+00', '2026-07-13 14:14:58.659915+00'),
('3385927e-cc89-4dd3-a929-354333cfe937', '74aa1fdf-7186-40ad-8056-af5f96d0901d', 'a66d7f5b-13e3-437e-947d-54b703351e36', '6a59fedc76a1df5cf0d4a2bcd3b18e3fba4c7b34c1e1906ba1b78335f3b40333', 'LEGEND12-KZTW-KZSSK', 'LEGEND12', 'unused', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, NULL, '2026-07-13 14:19:12.809571+00', '2026-07-13 14:19:12.809571+00'),
('51f8b3d7-b23c-4cc8-895c-06a10be844fb', '74aa1fdf-7186-40ad-8056-af5f96d0901d', 'a66d7f5b-13e3-437e-947d-54b703351e36', '6bc873e56843515809d5199208f2883b9ec04b4df178d20d5e31222aaf1a877b', 'LEGEND12-RBPP-ZLEPD', 'LEGEND12', 'unused', '2f412137-0da6-4865-bf6d-dc121c54beb5', NULL, NULL, NULL, '2026-07-13 14:19:12.809571+00', '2026-07-13 14:19:12.809571+00')
on conflict do nothing;

-- ========== subscriptions ==========
INSERT INTO public.subscriptions (id, user_id, plan_id, order_id, status, starts_at, ends_at, created_at, updated_at) VALUES ('e6ff0115-1c74-446c-8393-6e41210b217a', '2f412137-0da6-4865-bf6d-dc121c54beb5', '548ac229-2484-405b-a800-f1099c5dd17b', 'faae01d4-8506-4070-9e16-e53b1ac92bad', 'cancelled', '2026-07-10 02:07:09.324263+00', '2026-08-09 02:07:09.324263+00', '2026-07-10 02:07:09.324263+00', '2026-07-10 02:07:16.912205+00'),
('cd428669-c179-48db-b9a6-ed681ccc1356', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '548ac229-2484-405b-a800-f1099c5dd17b', 'eb24c600-1fe2-453d-bf44-0ad16f408c58', 'cancelled', '2026-07-13 14:24:38.724489+00', '2026-08-12 14:24:38.724489+00', '2026-07-13 14:24:38.724489+00', '2026-07-13 14:25:05.989594+00'),
('3c1dcead-ea48-42e1-a70c-9d50d5a2f1dc', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '548ac229-2484-405b-a800-f1099c5dd17b', '1cf5c5f3-6a87-42ea-abbb-6f593bdd25ef', 'cancelled', '2026-07-09 15:16:03.191491+00', '2026-08-08 15:16:03.191491+00', '2026-07-09 15:16:03.191491+00', '2026-07-13 14:25:08.004725+00')
on conflict do nothing;

-- ========== code_redemptions ==========
INSERT INTO public.code_redemptions (id, code_id, user_id, redeemed_at) VALUES ('5a043709-a4c5-420d-b347-936706f314ff', '6f603f66-b20e-450e-9fbe-4a5becc4fcec', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '2026-07-13 14:14:58.659915+00'),
('1e0a74a7-8a5d-4fcb-83de-ace419c42a7a', 'caae3481-9d23-441f-b838-376f7ef4d8db', 'ba1bd083-7b8d-4e63-b1a8-6ad57cd9025d', '2026-07-13 14:23:25.434529+00')
on conflict do nothing;

-- ========== order_items ==========
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price, subtotal, assigned_code_id, created_at) VALUES ('513e2f73-69aa-4a35-9574-78a59649a378', '1cf5c5f3-6a87-42ea-abbb-6f593bdd25ef', '46e2dc11-6eb2-4586-a363-892b6a814fca', '1', '49.00', '49.00', NULL, '2026-07-09 15:16:03.191491+00'),
('98211136-9425-43ad-a613-a9378eaa92ea', '00a308ea-4ba0-4529-a647-f54e3bd2926c', 'ae540b9e-d63a-4515-9b29-9cae835bb147', '1', '59.00', '59.00', NULL, '2026-07-10 01:25:04.045976+00'),
('ca52a910-ede2-4886-98d0-16fb98ab3b37', 'faae01d4-8506-4070-9e16-e53b1ac92bad', '46e2dc11-6eb2-4586-a363-892b6a814fca', '1', '49.00', '49.00', NULL, '2026-07-10 02:07:09.324263+00'),
('d19c10fa-5a26-4fa5-a77b-2d81528b94c9', 'eb24c600-1fe2-453d-bf44-0ad16f408c58', '46e2dc11-6eb2-4586-a363-892b6a814fca', '1', '49.00', '49.00', NULL, '2026-07-13 14:24:38.724489+00')
on conflict do nothing;

commit;
