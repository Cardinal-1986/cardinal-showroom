-- Additive owner-only workspace. Existing Showroom/CRM tables and policies stay intact.
create table public.visual_library_documents (
  key text primary key,
  document jsonb not null,
  created_at timestamptz not null default now(),
  author_id uuid not null default auth.uid() references auth.users(id)
);
alter table public.visual_library_documents enable row level security;
create policy visual_library_documents_read on public.visual_library_documents for select to authenticated
 using ((select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
create policy visual_library_documents_insert on public.visual_library_documents for insert to authenticated
 with check ((select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid and author_id=(select auth.uid()));
grant select,insert on public.visual_library_documents to authenticated;
revoke all on public.visual_library_documents from anon;
create table public.visual_library_entries (
  id uuid primary key default gen_random_uuid(),
  record_id text not null default 'WORLD-CARDINAL-WAY' check (length(record_id) between 1 and 120),
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) between 1 and 50000),
  kind text not null default 'progress' check (kind in ('progress','finding','decision','resource','handoff')),
  recorded_by text not null default 'Owner' check (length(recorded_by) between 1 and 80),
  author_id uuid not null default auth.uid() references auth.users(id),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.visual_library_entry_history (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.visual_library_entries(id),
  revision integer not null,
  snapshot jsonb not null,
  saved_at timestamptz not null default now()
);
create table public.visual_library_imports (
  id text primary key,
  manifest jsonb not null,
  imported_at timestamptz not null default now(),
  imported_by uuid not null default auth.uid() references auth.users(id)
);
create index visual_library_entry_history_entry_idx on public.visual_library_entry_history(entry_id,revision desc);
create index visual_library_entries_updated_idx on public.visual_library_entries(updated_at desc);
alter table public.visual_library_entries enable row level security;
alter table public.visual_library_entry_history enable row level security;
alter table public.visual_library_imports enable row level security;
create policy visual_library_owner_read on public.visual_library_entries for select to authenticated
  using ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
create policy visual_library_owner_insert on public.visual_library_entries for insert to authenticated
  with check ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid and author_id = (select auth.uid()));
create policy visual_library_owner_update on public.visual_library_entries for update to authenticated
  using ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid)
  with check (author_id = (select auth.uid()));
create policy visual_library_history_read on public.visual_library_entry_history for select to authenticated
  using ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
create policy visual_library_imports_owner on public.visual_library_imports for all to authenticated
  using ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid)
  with check ((select auth.uid()) = '74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid and imported_by = (select auth.uid()));
grant select, insert, update on public.visual_library_entries to authenticated;
grant select on public.visual_library_entry_history to authenticated;
grant select, insert, update on public.visual_library_imports to authenticated;
revoke all on public.visual_library_entries, public.visual_library_entry_history, public.visual_library_imports from anon;

create function public.visual_library_keep_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.visual_library_entry_history(entry_id, revision, snapshot)
    values(new.id, new.revision, to_jsonb(new));
  return new;
end;
$$;
-- AFTER creates a history row only after the corresponding entry exists.
create function public.visual_library_set_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.created_at := old.created_at;
  new.author_id := old.author_id;
  new.updated_at := now();
  return new;
end;
$$;
create trigger visual_library_revision before update on public.visual_library_entries
for each row execute function public.visual_library_set_revision();
create trigger visual_library_history after insert or update on public.visual_library_entries
for each row execute function public.visual_library_keep_history();
revoke all on function public.visual_library_keep_history() from public;
revoke all on function public.visual_library_set_revision() from public;
revoke all on function public.visual_library_keep_history() from anon, authenticated;
revoke all on function public.visual_library_set_revision() from anon, authenticated;
create index visual_library_documents_author_idx on public.visual_library_documents(author_id);
create index visual_library_entries_author_idx on public.visual_library_entries(author_id);
create index visual_library_imports_author_idx on public.visual_library_imports(imported_by);

insert into storage.buckets(id,name,public,file_size_limit)
values ('cardinal-visual-workspace','cardinal-visual-workspace',false,104857600);
create policy visual_workspace_owner_read on storage.objects for select to authenticated
  using (bucket_id='cardinal-visual-workspace' and (select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
create policy visual_workspace_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id='cardinal-visual-workspace' and (select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
create policy visual_workspace_owner_update on storage.objects for update to authenticated
  using (bucket_id='cardinal-visual-workspace' and (select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid)
  with check (bucket_id='cardinal-visual-workspace' and (select auth.uid())='74ab4fdf-3e78-49a7-8e23-e841408a184d'::uuid);
