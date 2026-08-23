begin;
select plan(7);

select has_extension('postgis', 'PostGIS is enabled');
select has_index('public', 'spots', 'spots_location_gix', 'Spot geography has a GiST index');
select policies_are('public', 'private_spot_locations', array['private_location_owner_all'], 'Exact private coordinates have only owner policy');
select function_returns('public', 'nearby_spots', array['double precision', 'double precision', 'integer', 'integer'], 'setof record', 'Nearby function exists');
select isnt_empty($$select pg_get_functiondef('public.nearby_spots(double precision,double precision,integer,integer)'::regprocedure) where pg_get_functiondef('public.nearby_spots(double precision,double precision,integer,integer)'::regprocedure) ilike '%st_dwithin%'$$, 'Nearby query uses ST_DWithin');
select has_index('public', 'discovery_runs', 'discovery_runs_active_idx', 'Concurrent discovery runs are locked per region');
select results_eq($$select count(*)::bigint from public.regulations where version_id = (select id from public.regulation_versions where version = 'TR-6-2-2024-21-AMENDED-2025-12')$$, array[8::bigint], 'Bundled regulation version has eight sourced target rows');

select * from finish();
rollback;
