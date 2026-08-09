import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../../..');
const outputDir = path.join(workspaceRoot, 'leyendas-de-bacalar/backend/supabase/rebuild');
const schemaPath = path.join(workspaceRoot, 'esquema_leyendas_bacalar.sql');
const dataPath = path.join(workspaceRoot, 'datos_leyendas_bacalar.sql');

const OLD_PROJECT_REF = 'wkkzgyhyarqwxoqcdaul';
const NEW_PROJECT_REF = 'ojwxchkgzywteutqxkfg';

const schema = (await readFile(schemaPath, 'utf8')).replace(/\r\n/g, '\n');
const data = (await readFile(dataPath, 'utf8')).replace(/\r\n/g, '\n');
const schemaLines = schema.split('\n');

const sectionLine = (label) => {
  const index = schemaLines.findIndex((line) => line.includes(label));
  if (index < 0) throw new Error(`Schema section not found: ${label}`);
  return index;
};

const sectionIndexes = {
  types: sectionLine('-- 1. TIPOS ENUMERADOS'),
  tables: sectionLine('-- 2. TABLAS'),
  constraints: sectionLine('-- 3. LLAVES PRIMARIAS'),
  foreignKeys: sectionLine('-- 4. LLAVES FORÁNEAS'),
  indexes: sectionLine('-- 5. ÍNDICES'),
  functions: sectionLine('-- 6. FUNCIONES'),
  triggers: sectionLine('-- 7. TRIGGERS'),
  rls: sectionLine('-- 8. ROW LEVEL SECURITY'),
  privileges: sectionLine('-- 9. PRIVILEGIOS'),
};

const sliceSection = (start, end) => schemaLines.slice(start, end).join('\n').trim();
const wrapMigration = (title, body) => `-- Leyendas de Bacalar\n-- ${title}\n-- Target Supabase project: ${NEW_PROJECT_REF}\n\nbegin;\n\nset local search_path to public, extensions;\n\n${body.trim()}\n\ncommit;\n`;

const typesSection = sliceSection(sectionIndexes.types, sectionIndexes.tables);
const tablesSection = sliceSection(sectionIndexes.tables, sectionIndexes.constraints);
const constraintsSection = [
  sliceSection(sectionIndexes.constraints, sectionIndexes.foreignKeys),
  sliceSection(sectionIndexes.foreignKeys, sectionIndexes.indexes),
  sliceSection(sectionIndexes.indexes, sectionIndexes.functions),
].join('\n\n');
const triggerSection = sliceSection(sectionIndexes.triggers, sectionIndexes.rls);
const rawRlsSection = sliceSection(sectionIndexes.rls, sectionIndexes.privileges);
const optimizedRlsSection = rawRlsSection.replace(/auth\.uid\(\)/gi, '(select auth.uid())');

const functionSection = sliceSection(sectionIndexes.functions, sectionIndexes.triggers);
const functionBlocks = [...functionSection.matchAll(
  /CREATE OR REPLACE FUNCTION public\.([a-zA-Z0-9_]+)\s*\(([^)]*)\)[\s\S]*?\$function\$\s*;/gi,
)].map((match, originalOrder) => ({
  name: match[1],
  args: match[2].replace(/\s+/g, ' ').trim(),
  text: match[0].trim(),
  originalOrder,
  dependencies: [],
}));

const functionNames = new Set(functionBlocks.map((fn) => fn.name));
const functionByName = new Map(functionBlocks.map((fn) => [fn.name, fn]));

for (const fn of functionBlocks) {
  fn.dependencies = [...new Set(
    [...fn.text.matchAll(/public\.([a-zA-Z0-9_]+)\s*\(/gi)]
      .map((match) => match[1])
      .filter((name) => name !== fn.name && functionNames.has(name)),
  )];
}

const pendingFunctions = new Map(functionByName);
const orderedFunctions = [];

while (pendingFunctions.size) {
  const ready = [...pendingFunctions.values()]
    .filter((fn) => fn.dependencies.every((dependency) => !pendingFunctions.has(dependency)))
    .sort((a, b) => a.originalOrder - b.originalOrder);

  if (!ready.length) {
    const unresolved = [...pendingFunctions.values()]
      .map((fn) => `${fn.name} -> ${fn.dependencies.filter((dep) => pendingFunctions.has(dep)).join(', ')}`)
      .join('; ');
    throw new Error(`Function dependency cycle: ${unresolved}`);
  }

  for (const fn of ready) {
    orderedFunctions.push(fn);
    pendingFunctions.delete(fn.name);
  }
}

const orderedFunctionSql = [
  '-- 6. FUNCIONES ORDENADAS POR DEPENDENCIAS',
  '-- Generated from the recovered catalog dump. Do not reorder manually.',
  '',
  ...orderedFunctions.flatMap((fn, index) => [
    `-- ${String(index + 1).padStart(2, '0')}. ${fn.name}(${fn.args})`,
    fn.text,
    '',
  ]),
].join('\n').trim();

const tableNames = [...schema.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.([a-zA-Z0-9_]+)/gi)]
  .map((match) => match[1]);
const typeNames = [...schema.matchAll(/CREATE TYPE public\.([a-zA-Z0-9_]+)/gi)]
  .map((match) => match[1]);

const policyStatements = [...rawRlsSection.matchAll(/CREATE POLICY\s+[\s\S]*?;/gi)].map((match) => match[0]);
const privilegesByTable = new Map(tableNames.map((table) => [table, { anon: new Set(), authenticated: new Set() }]));
const operationMap = {
  ALL: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  SELECT: ['SELECT'],
  INSERT: ['INSERT'],
  UPDATE: ['UPDATE'],
  DELETE: ['DELETE'],
};

for (const statement of policyStatements) {
  const match = statement.match(
    /CREATE POLICY\s+(?:"[^"]+"|[a-zA-Z0-9_]+)\s+ON\s+public\.([a-zA-Z0-9_]+)[\s\S]*?FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\s+TO\s+([a-zA-Z0-9_, ]+)/i,
  );
  if (!match || !privilegesByTable.has(match[1])) continue;

  const table = match[1];
  const operation = match[2].toUpperCase();
  const roles = match[3].split(',').map((role) => role.trim().toLowerCase()).filter(Boolean);
  const operations = operationMap[operation];

  for (const role of roles) {
    if (role === 'public') {
      for (const privilege of operations) privilegesByTable.get(table).authenticated.add(privilege);
      if (operation === 'SELECT') privilegesByTable.get(table).anon.add('SELECT');
    } else if (role === 'anon' || role === 'authenticated') {
      for (const privilege of operations) privilegesByTable.get(table)[role].add(privilege);
    }
  }
}

const tableGrantLines = [];
for (const table of [...tableNames].sort()) {
  const grants = privilegesByTable.get(table);
  const anon = [...grants.anon].sort();
  const authenticated = [...grants.authenticated].sort();

  if (table === 'creator_onboarding_email_tokens') continue;
  if (table === 'users_profile') {
    if (anon.includes('SELECT')) tableGrantLines.push('grant select on table public.users_profile to anon;');
    if (authenticated.includes('SELECT')) tableGrantLines.push('grant select on table public.users_profile to authenticated;');
    tableGrantLines.push(
      'grant update (active_role, avatar_url, bio, cover_url, full_name, updated_at, username) on table public.users_profile to authenticated;',
    );
    continue;
  }

  if (anon.length) tableGrantLines.push(`grant ${anon.join(', ')} on table public.${table} to anon;`);
  if (authenticated.length) {
    tableGrantLines.push(`grant ${authenticated.join(', ')} on table public.${table} to authenticated;`);
  }
}

const rlsHelperFunctions = [
  'has_role',
  'current_user_has_role',
  'current_user_is_admin',
  'current_user_is_super_admin',
  'get_legend_id_from_page',
  'get_legend_id_from_scene',
  'is_legend_creator',
  'is_legend_published',
  'is_marker_creator',
  'is_page_creator',
  'is_physical_edition_creator',
  'is_scene_creator',
  'is_version_creator',
  'is_version_published',
  'user_has_active_legend_access',
];

const authenticatedRpcFunctions = [
  'approve_content_review',
  'approve_creator_application',
  'cancel_subscription',
  'confirm_creator_onboarding',
  'create_code_batch',
  'delete_creator_legend',
  'delete_legend_draft',
  'process_simulated_product_purchase',
  'process_simulated_subscription',
  'publish_legend_version',
  'redeem_access_code',
  'reject_content_review',
  'reject_creator_application',
  'request_content_changes',
  'self_generate_codes',
  'submit_creator_onboarding_request',
  'submit_legend_version_for_review',
];

const serviceRoleOnlyFunctions = [
  'grant_legend_access',
  'issue_creator_onboarding_email_token',
  'redeem_access_code_as',
];

const sqlTextArray = (values) => `array[${values.map((value) => `'${value}'`).join(', ')}]::text[]`;
const grantFunctionsDoBlock = (functions, roles) => `do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (${sqlTextArray(functions)})
  loop
    execute format('grant execute on function %s to ${roles}', function_record.signature);
  end loop;
end
$$;`;

const privilegesSql = `-- 9. PRIVILEGIOS EXPLICITOS PARA DATA API
-- Supabase projects created in 2026 no longer expose new tables automatically.

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

${tableGrantLines.join('\n')}

revoke all on table public.creator_onboarding_email_tokens from public, anon, authenticated;
grant all on table public.creator_onboarding_email_tokens to service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Helpers required by RLS. Anonymous callers can execute them, but their
-- predicates still return false when auth.uid() is null.
${grantFunctionsDoBlock(rlsHelperFunctions, 'anon, authenticated')}

-- RPCs intentionally exposed to signed-in users. Authorization is enforced
-- inside each function and by its fixed search_path.
${grantFunctionsDoBlock(authenticatedRpcFunctions, 'authenticated')}

-- These functions are backend-only. Keep them unavailable to browser clients.
${grantFunctionsDoBlock(serviceRoleOnlyFunctions, 'service_role')}
`;

const storageSql = `-- 10. STORAGE
-- legend-assets is public for covers, illustrations, markers and 3D models.
-- legend-documents is private for PDF/DOCX sources and rendered page images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'legend-assets',
    'legend-assets',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream'
    ]
  ),
  (
    'legend-documents',
    'legend-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "legend_assets_owner_select" on storage.objects;
drop policy if exists "legend_assets_owner_insert" on storage.objects;
drop policy if exists "legend_assets_owner_update" on storage.objects;
drop policy if exists "legend_assets_owner_delete" on storage.objects;
drop policy if exists "legend_documents_owner_select" on storage.objects;

create policy "legend_assets_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_documents_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'legend-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
`;

const seedSql = `-- 11. DATOS BASE SEGUROS
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
`;

const dataHeaders = [...data.matchAll(/^-- ========== ([a-zA-Z0-9_]+) ==========\s*$/gm)]
  .map((match, index, matches) => ({
    name: match[1],
    start: match.index,
    end: index + 1 < matches.length ? matches[index + 1].index : data.length,
  }));
const dataBlockByTable = new Map(
  dataHeaders
    .map((header) => [header.name, data.slice(header.start, header.end).trim()])
    .filter(([, block]) => /INSERT INTO public\./i.test(block)),
);
const dataTables = [...dataBlockByTable.keys()];

const foreignKeys = [...schema.matchAll(
  /ALTER TABLE public\.([a-zA-Z0-9_]+)\s+ADD CONSTRAINT\s+([a-zA-Z0-9_]+)\s+FOREIGN KEY\s*\([^)]+\)\s+REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)/gi,
)].map((match) => ({ table: match[1], referencedTable: match[3] }));
const tableDependencies = new Map(dataTables.map((table) => [table, new Set()]));

for (const foreignKey of foreignKeys) {
  if (
    tableDependencies.has(foreignKey.table)
    && tableDependencies.has(foreignKey.referencedTable)
    && foreignKey.table !== foreignKey.referencedTable
  ) {
    tableDependencies.get(foreignKey.table).add(foreignKey.referencedTable);
  }
}

const pendingTables = new Set(dataTables);
const orderedDataTables = [];

while (pendingTables.size) {
  const ready = dataTables.filter(
    (table) => pendingTables.has(table)
      && [...tableDependencies.get(table)].every((dependency) => !pendingTables.has(dependency)),
  );
  if (!ready.length) {
    throw new Error(`Data dependency cycle: ${[...pendingTables].join(', ')}`);
  }
  for (const table of ready) {
    orderedDataTables.push(table);
    pendingTables.delete(table);
  }
}

const makeInsertIdempotent = (table, block) => {
  if (table === 'users_profile') {
    const columnsMatch = block.match(/INSERT INTO public\.users_profile\s*\(([^)]+)\)/i);
    if (!columnsMatch) throw new Error('users_profile column list not found');
    const columns = columnsMatch[1].split(',').map((column) => column.trim());
    const updates = columns
      .filter((column) => column !== 'id' && column !== 'created_at')
      .map((column) => `${column} = excluded.${column}`)
      .join(',\n  ');
    return block.replace(/;\s*$/, `\non conflict (id) do update set\n  ${updates};`);
  }
  return block.replace(/;\s*$/, '\non conflict do nothing;');
};

const usersProfileBlock = dataBlockByTable.get('users_profile') || '';
const authUserIds = [...usersProfileBlock.matchAll(/(?:VALUES\s*|\n)\('([0-9a-f-]{36})'/gi)]
  .map((match) => match[1]);
const authValues = authUserIds.map((id) => `('${id}'::uuid)`).join(',\n      ');

const recoverySql = `-- RECUPERACIÓN HISTÓRICA DESPUÉS DE AUTH
-- Do not run this file until the old Auth users have been restored with the
-- same UUIDs. The preflight below aborts before writing if any user is missing.
-- Storage URLs still point to ${OLD_PROJECT_REF}; migrate objects before rewriting them.

begin;

do $$
declare
  missing_user_ids uuid[];
begin
  select array_agg(expected.id order by expected.id)
  into missing_user_ids
  from (
    values
      ${authValues}
  ) as expected(id)
  left join auth.users actual on actual.id = expected.id
  where actual.id is null;

  if missing_user_ids is not null then
    raise exception 'Historical import blocked. Missing auth.users UUIDs: %', missing_user_ids;
  end if;
end
$$;

${orderedDataTables.map((table) => makeInsertIdempotent(table, dataBlockByTable.get(table))).join('\n\n')}

commit;
`;

const resetSql = `-- OPTIONAL AND DESTRUCTIVE: reset a partial Leyendas installation.
-- Use only on the new empty project ${NEW_PROJECT_REF} before production data exists.
-- This targets only known Leyendas objects; it does not drop auth or storage schemas.

begin;

drop trigger if exists on_auth_user_created on auth.users;

do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (${sqlTextArray([...functionNames])})
  loop
    execute format('drop function if exists %s cascade', function_record.signature);
  end loop;
end
$$;

${[...tableNames].reverse().map((table) => `drop table if exists public.${table} cascade;`).join('\n')}

${[...typeNames].reverse().map((type) => `drop type if exists public.${type} cascade;`).join('\n')}

commit;
`;

const expectedCodeTables = [...tableNames];
const expectedCodeRpcs = [
  ...authenticatedRpcFunctions,
  'grant_legend_access',
  'redeem_access_code_as',
  'user_has_active_legend_access',
];

const verifySql = `-- 12. VERIFICACIÓN ESTRUCTURAL
-- Returns one summary row and raises an exception for missing critical objects.

do $$
declare
  missing_tables text[];
  missing_functions text[];
  tables_without_rls text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_tables
  from unnest(${sqlTextArray(expectedCodeTables)}) as expected(name)
  left join information_schema.tables actual
    on actual.table_schema = 'public' and actual.table_name = expected.name
  where actual.table_name is null;

  select array_agg(expected.name order by expected.name)
  into missing_functions
  from unnest(${sqlTextArray(expectedCodeRpcs)}) as expected(name)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = expected.name
  );

  select array_agg(c.relname order by c.relname)
  into tables_without_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any (${sqlTextArray(tableNames)})
    and not c.relrowsecurity;

  if missing_tables is not null then
    raise exception 'Missing code contract tables: %', missing_tables;
  end if;
  if missing_functions is not null then
    raise exception 'Missing code contract functions: %', missing_functions;
  end if;
  if tables_without_rls is not null then
    raise exception 'RLS is disabled on: %', tables_without_rls;
  end if;
  if not exists (select 1 from storage.buckets where id = 'legend-assets' and public) then
    raise exception 'Public bucket legend-assets is missing or not public';
  end if;
  if not exists (select 1 from storage.buckets where id = 'legend-documents' and not public) then
    raise exception 'Private bucket legend-documents is missing or public';
  end if;
end
$$;

select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = any (${sqlTextArray(tableNames)})) as leyendas_tables,
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = any (${sqlTextArray(typeNames)})) as leyendas_types,
  (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any (${sqlTextArray([...functionNames])})) as leyendas_functions,
  (select count(*) from pg_policies where schemaname = 'public') as public_policies,
  (select count(*) from storage.buckets where id in ('legend-assets', 'legend-documents')) as storage_buckets,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
  ) as auth_profile_trigger;
`;

const readme = `# Reconstrucción de Supabase - Leyendas de Bacalar

Objetivo: reconstruir el proyecto Supabase \`${NEW_PROJECT_REF}\` desde el contrato real del código y el catálogo recuperado del proyecto \`${OLD_PROJECT_REF}\`.

## Orden de ejecución

Ejecuta cada archivo por separado en **Supabase SQL Editor**, esperando éxito antes de continuar:

1. \`00_reset_partial_install.sql\` solo si el proyecto nuevo quedó parcialmente creado por intentos anteriores. Es destructivo para los objetos de Leyendas.
2. \`01_extensions_and_types.sql\`
3. \`02_tables.sql\`
4. \`03_constraints_foreign_keys_indexes.sql\`
5. \`04_functions.sql\`
6. \`05_triggers.sql\`
7. \`06_rls.sql\`
8. \`07_privileges.sql\`
9. \`08_storage.sql\`
10. \`09_seed_reference.sql\`
11. \`10_verify.sql\`

No ejecutes \`90_recovery_data_after_auth.sql\` durante la instalación inicial.

## Por qué está separado

- Las funciones se ordenan por dependencia. Esto corrige los errores \`has_role(...) does not exist\` y \`get_legend_id_from_scene(...) does not exist\`.
- RLS y privilegios se aplican después de funciones y tablas.
- Los permisos del Data API son explícitos; no dependen de los defaults del proyecto.
- Storage se reconstruye con \`legend-assets\` público y \`legend-documents\` privado.
- Los datos de referencia no incluyen usuarios, leyendas demo ni enlaces rotos.

## Datos históricos

\`90_recovery_data_after_auth.sql\` contiene los 35 bloques de datos recuperados, reordenados por llaves foráneas. Antes de escribir, verifica que los UUID históricos existan en \`auth.users\`. Si falta uno, aborta toda la transacción.

No se pueden recuperar contraseñas ni objetos de Storage desde los archivos SQL. Las 128 URLs del proyecto anterior solo vuelven a funcionar si los objetos reales se migran; cambiar únicamente el dominio produciría enlaces falsos.

## Después de verificar la base

- Desplegar la Edge Function \`send-creator-onboarding-email\` con JWT habilitado y configurar sus secretos.
- Cambiar en Vercel \`VITE_SUPABASE_URL\` y \`VITE_SUPABASE_ANON_KEY\`.
- Cambiar en Render \`SUPABASE_URL\` y \`SUPABASE_SERVICE_ROLE_KEY\`.
- Actualizar el móvil: \`EXPO_PUBLIC_SUPABASE_URL\` y su publishable/anon key.
- Corregir las referencias públicas todavía fijadas al proyecto anterior en \`frontend/index.html\` y \`mobile/eas.json\`.

No guardes claves reales en Git ni las pegues en archivos SQL.
`;

const outputs = new Map([
  ['README.md', readme],
  ['00_reset_partial_install.sql', resetSql],
  ['01_extensions_and_types.sql', wrapMigration(
    '01 - Extensions and enum types',
    `create extension if not exists pgcrypto with schema extensions;\n\n${typesSection}`,
  )],
  ['02_tables.sql', wrapMigration('02 - Tables', tablesSection)],
  ['03_constraints_foreign_keys_indexes.sql', wrapMigration(
    '03 - Constraints, foreign keys and indexes',
    constraintsSection,
  )],
  ['04_functions.sql', wrapMigration('04 - Dependency-ordered functions', orderedFunctionSql)],
  ['05_triggers.sql', wrapMigration('05 - Triggers', triggerSection)],
  ['06_rls.sql', wrapMigration('06 - Row Level Security', optimizedRlsSection)],
  ['07_privileges.sql', wrapMigration('07 - Explicit Data API privileges', privilegesSql)],
  ['08_storage.sql', wrapMigration('08 - Storage buckets and owner policies', storageSql)],
  ['09_seed_reference.sql', wrapMigration('09 - Safe reference data', seedSql)],
  ['10_verify.sql', verifySql],
  ['90_recovery_data_after_auth.sql', recoverySql],
]);

await mkdir(outputDir, { recursive: true });
for (const [filename, content] of outputs) {
  const preserveOldProjectReference = filename === 'README.md' || filename === '90_recovery_data_after_auth.sql';
  await writeFile(
    path.join(outputDir, filename),
    content.replaceAll(OLD_PROJECT_REF, preserveOldProjectReference ? OLD_PROJECT_REF : NEW_PROJECT_REF),
    'utf8',
  );
}

console.log(`Generated ${outputs.size} files in ${outputDir}`);
console.log(`Schema: ${typeNames.length} types, ${tableNames.length} tables, ${orderedFunctions.length} functions, ${policyStatements.length} policies`);
console.log(`Historical data: ${orderedDataTables.length} INSERT blocks, ${authUserIds.length} required Auth UUIDs`);
