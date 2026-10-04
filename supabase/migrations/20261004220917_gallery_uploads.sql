-- Latest Uploads holding area for society botanic (BGS gallery).
-- Service role (bgs-api) reads/writes; anon and authenticated have no policies.

create table if not exists thegolfapp.gallery_uploads (
  id uuid primary key default gen_random_uuid(),
  society_id text not null default 'botanic',
  storage_path text not null,
  public_url text not null,
  original_filename text,
  mime_type text not null default 'image/jpeg',
  byte_size integer not null default 0,
  uploader_token_hash text not null,
  uploaded_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_to_album text
);

create index if not exists gallery_uploads_latest_idx
  on thegolfapp.gallery_uploads (society_id, uploaded_at desc)
  where archived_at is null;

comment on table thegolfapp.gallery_uploads is
  'BGS gallery holding photos. Rows with archived_at null appear in Latest Uploads.';

alter table thegolfapp.gallery_uploads enable row level security;

revoke all on table thegolfapp.gallery_uploads from anon, authenticated;
grant all on table thegolfapp.gallery_uploads to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bgs-gallery-uploads',
  'bgs-gallery-uploads',
  true,
  102400,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
