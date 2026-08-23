create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.experience_level as enum ('FIRST_TIME', 'BEGINNER', 'INTERMEDIATE', 'EXPERIENCED');
create type public.fishing_type as enum ('SHORE', 'BOAT', 'FRESHWATER');
create type public.verification_status as enum ('VERIFIED', 'COMMUNITY', 'WEB_DISCOVERED', 'POTENTIAL');
create type public.publication_level as enum ('PUBLIC', 'PRIVATE', 'APPROXIMATE');
create type public.coordinate_precision as enum ('EXACT', 'APPROXIMATE', 'UNKNOWN');
create type public.prohibited_status as enum ('NONE', 'UNKNOWN', 'PROHIBITED', 'SECURITY_AREA');
create type public.sync_entity_type as enum ('CATCH_REPORT', 'USER_SPOT', 'FAVORITE', 'FEEDBACK');
create type public.sync_operation_type as enum ('UPSERT', 'DELETE');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  experience public.experience_level not null default 'FIRST_TIME',
  fishing_type public.fishing_type not null default 'SHORE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gear_profiles (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  rod_type text,
  rod_length_cm smallint check (rod_length_cm between 50 and 1000),
  casting_weight_min_g numeric(6,2) check (casting_weight_min_g >= 0),
  casting_weight_max_g numeric(6,2) check (casting_weight_max_g >= casting_weight_min_g),
  reel_size smallint check (reel_size between 100 and 30000),
  main_line text,
  line_diameter_mm numeric(4,3),
  pe_rating numeric(4,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.species (
  id text primary key,
  name_tr text not null,
  active_months smallint[] not null default '{}',
  config jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.spots (
  id uuid primary key,
  owner_id uuid references auth.users(id) on delete set null,
  canonical_name text not null check (char_length(canonical_name) between 1 and 160),
  local_names text[] not null default '{}',
  location extensions.geography(point, 4326),
  coordinate_precision public.coordinate_precision not null,
  uncertainty_radius_m integer check (uncertainty_radius_m is null or uncertainty_radius_m > 0),
  province text not null,
  district text not null,
  country char(2) not null default 'TR',
  coastline_type text not null,
  access_type text not null,
  beginner_suitability text not null,
  terrain text not null default 'Bilinmiyor',
  parking_notes text,
  walking_distance_m integer check (walking_distance_m is null or walking_distance_m >= 0),
  known_hazards text[] not null default '{}',
  access_warnings text[] not null default '{}',
  prohibited_status public.prohibited_status not null default 'UNKNOWN',
  techniques text[] not null default '{}',
  recommended_gear_tags text[] not null default '{}',
  source_type text not null,
  verification_status public.verification_status not null,
  confidence_score numeric(4,3) not null check (confidence_score between 0 and 1),
  publication_level public.publication_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((coordinate_precision = 'UNKNOWN') = (location is null)),
  check (publication_level <> 'PRIVATE' or owner_id is not null)
);

comment on column public.spots.location is 'Public/display location. APPROXIMATE records contain only obfuscated coordinates; exact owner coordinate is isolated in private_spot_locations.';

create index spots_location_gix on public.spots using gist(location);
create index spots_publication_idx on public.spots(publication_level, verification_status);
create index spots_updated_idx on public.spots(updated_at desc);

create table public.private_spot_locations (
  spot_id uuid primary key references public.spots(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  exact_location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  check (owner_id is not null)
);
create index private_spot_locations_gix on public.private_spot_locations using gist(exact_location);

create table public.spot_species (
  spot_id uuid not null references public.spots(id) on delete cascade,
  species_id text not null references public.species(id),
  evidence_level numeric(4,3) not null default 0.5 check (evidence_level between 0 and 1),
  primary key (spot_id, species_id)
);

create table public.spot_sources (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  url text not null,
  title text not null,
  source_date date,
  accessed_at timestamptz not null,
  evidence_type text not null,
  evidence_excerpt text,
  created_at timestamptz not null default now(),
  unique (spot_id, url, evidence_type)
);

create table public.condition_snapshots (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  spot_id uuid references public.spots(id) on delete cascade,
  rounded_location extensions.geography(point, 4326) not null,
  air_temperature_c numeric(5,2),
  precipitation_mm numeric(7,2),
  wind_speed_kmh numeric(6,2),
  wind_direction_deg numeric(6,2),
  wind_gust_kmh numeric(6,2),
  wave_height_m numeric(5,2),
  wave_direction_deg numeric(6,2),
  wave_period_s numeric(6,2),
  swell_height_m numeric(5,2),
  sea_surface_temperature_c numeric(5,2),
  current_speed_kmh numeric(6,2),
  current_direction_deg numeric(6,2),
  sunrise timestamptz,
  sunset timestamptz,
  provider text not null,
  raw_payload jsonb not null default '{}',
  observed_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index condition_snapshots_expiry_idx on public.condition_snapshots(cache_key, expires_at desc);

create table public.favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, spot_id)
);

create table public.catch_reports (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  target_species_id text references public.species(id),
  caught_species jsonb not null default '[]',
  quantity integer check (quantity is null or quantity >= 0),
  approximate_length_cm numeric(6,2),
  gear_profile_id uuid references public.gear_profiles(id) on delete set null,
  bait_or_lure text,
  weight_g numeric(7,2),
  result text not null check (result in ('NONE', 'LOW', 'MEDIUM', 'GOOD')),
  photo_paths text[] not null default '{}',
  note text,
  condition_snapshot_id uuid references public.condition_snapshots(id) on delete set null,
  share_publicly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spot_feedback (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('LOCATION_CORRECT', 'FISHABLE', 'ACCESS_CHANGED', 'PROHIBITED', 'DANGEROUS', 'SPECIES_WRONG')),
  note text,
  created_at timestamptz not null default now()
);
create index spot_feedback_rate_idx on public.spot_feedback(owner_id, created_at desc);

create table public.sync_operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  entity_type public.sync_entity_type not null,
  entity_id uuid not null,
  operation public.sync_operation_type not null,
  response_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  primary key (owner_id, idempotency_key)
);

create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  region_key text not null,
  radius_km integer not null,
  species_id text references public.species(id),
  status text not null check (status in ('RUNNING', 'COMPLETED', 'FAILED', 'BUDGET_BLOCKED')),
  search_calls integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10,5) not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text
);
create index discovery_runs_region_idx on public.discovery_runs(region_key, started_at desc);

create table public.discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.discovery_runs(id) on delete cascade,
  canonical_name text not null,
  district text,
  province text,
  candidate_location extensions.geography(point, 4326),
  coordinate_precision public.coordinate_precision not null,
  coordinate_evidence text,
  target_species text[] not null default '{}',
  access_evidence text,
  confidence_score numeric(4,3) not null check (confidence_score between 0 and 1),
  review_status text not null default 'PENDING' check (review_status in ('PENDING', 'ACCEPTED', 'REJECTED', 'DUPLICATE')),
  created_at timestamptz not null default now(),
  check ((coordinate_precision = 'UNKNOWN') = (candidate_location is null))
);

create table public.discovery_sources (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.discovery_candidates(id) on delete cascade,
  url text not null,
  title text not null,
  source_date date,
  supports_coordinate boolean not null default false,
  supports_fishing boolean not null default false,
  unique (candidate_id, url)
);

create table public.regulation_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  source_url text not null,
  source_title text not null,
  effective_from date,
  effective_to date,
  checked_at timestamptz not null,
  published_at timestamptz
);

create table public.regulations (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.regulation_versions(id) on delete cascade,
  species_id text references public.species(id),
  region text,
  minimum_length_cm numeric(6,2),
  daily_limit integer,
  prohibited_from date,
  prohibited_to date,
  rule_text text not null
);

create table public.offline_regions (
  id text primary key,
  name_tr text not null,
  bounds jsonb not null,
  min_zoom numeric(4,1) not null,
  max_zoom numeric(4,1) not null,
  style_url text not null,
  package_version text not null,
  checksum_sha256 text not null,
  estimated_bytes bigint not null,
  published_at timestamptz not null,
  active boolean not null default true
);

insert into public.species (id, name_tr, active_months) values
  ('ISTAVRIT', 'İstavrit', '{1,2,3,4,5,6,7,8,9,10,11,12}'),
  ('LUFER', 'Lüfer', '{9,10,11,12}'),
  ('CINEKOP', 'Çinekop', '{1,9,10,11,12}'),
  ('SARIKANAT', 'Sarıkanat', '{9,10,11,12}'),
  ('PALAMUT', 'Palamut', '{8,9,10,11}'),
  ('LEVREK', 'Levrek', '{1,2,3,4,10,11,12}'),
  ('MEZGIT', 'Mezgit', '{1,2,3,4,11,12}'),
  ('ZARGANA', 'Zargana', '{5,6,7,8,9,10}'),
  ('HAMSI', 'Hamsi', '{1,2,10,11,12}');

create or replace function public.nearby_spots(lat double precision, lon double precision, radius_m integer, result_limit integer default 100)
returns table (
  id uuid,
  canonical_name text,
  latitude double precision,
  longitude double precision,
  distance_m double precision,
  verification_status public.verification_status,
  confidence_score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id,
    s.canonical_name,
    extensions.st_y(s.location::extensions.geometry) as latitude,
    extensions.st_x(s.location::extensions.geometry) as longitude,
    extensions.st_distance(s.location, extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography) as distance_m,
    s.verification_status,
    s.confidence_score
  from public.spots s
  where s.publication_level in ('PUBLIC', 'APPROXIMATE')
    and s.coordinate_precision <> 'UNKNOWN'
    and s.prohibited_status not in ('PROHIBITED', 'SECURITY_AREA')
    and extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography, radius_m)
  order by s.location <-> extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography
  limit least(greatest(result_limit, 1), 200);
$$;

revoke all on function public.nearby_spots(double precision, double precision, integer, integer) from public;
grant execute on function public.nearby_spots(double precision, double precision, integer, integer) to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.gear_profiles enable row level security;
alter table public.species enable row level security;
alter table public.spots enable row level security;
alter table public.private_spot_locations enable row level security;
alter table public.spot_species enable row level security;
alter table public.spot_sources enable row level security;
alter table public.condition_snapshots enable row level security;
alter table public.favorites enable row level security;
alter table public.catch_reports enable row level security;
alter table public.spot_feedback enable row level security;
alter table public.sync_operations enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_candidates enable row level security;
alter table public.discovery_sources enable row level security;
alter table public.regulation_versions enable row level security;
alter table public.regulations enable row level security;
alter table public.offline_regions enable row level security;

create policy profiles_owner_all on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy gear_owner_all on public.gear_profiles for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy species_public_read on public.species for select to anon, authenticated using (true);
create policy spots_public_read on public.spots for select to anon, authenticated using (publication_level in ('PUBLIC', 'APPROXIMATE') and coordinate_precision <> 'UNKNOWN');
create policy spots_owner_all on public.spots for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy private_location_owner_all on public.private_spot_locations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy spot_species_public_read on public.spot_species for select to anon, authenticated using (exists (select 1 from public.spots s where s.id = spot_id and s.publication_level in ('PUBLIC', 'APPROXIMATE')));
create policy spot_sources_public_read on public.spot_sources for select to anon, authenticated using (exists (select 1 from public.spots s where s.id = spot_id and s.publication_level in ('PUBLIC', 'APPROXIMATE')));
create policy conditions_public_read on public.condition_snapshots for select to anon, authenticated using (true);
create policy favorites_owner_all on public.favorites for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy reports_owner_all on public.catch_reports for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy feedback_owner_select on public.spot_feedback for select to authenticated using (owner_id = auth.uid());
create policy feedback_owner_insert on public.spot_feedback for insert to authenticated with check (owner_id = auth.uid());
create policy sync_owner_select on public.sync_operations for select to authenticated using (owner_id = auth.uid());
create policy regulations_public_read on public.regulation_versions for select to anon, authenticated using (true);
create policy regulation_rows_public_read on public.regulations for select to anon, authenticated using (true);
create policy offline_regions_public_read on public.offline_regions for select to anon, authenticated using (active);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catch-photos', 'catch-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy catch_photos_owner_select on storage.objects for select to authenticated using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy catch_photos_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy catch_photos_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

