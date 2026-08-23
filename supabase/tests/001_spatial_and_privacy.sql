begin;
select plan(5);

select has_extension('postgis', 'PostGIS is enabled');
select has_index('public', 'spots', 'spots_location_gix', 'Spot geography has a GiST index');
select policies_are('public', 'private_spot_locations', array['private_location_owner_all'], 'Exact private coordinates have only owner policy');
select function_returns('public', 'nearby_spots', array['double precision', 'double precision', 'integer', 'integer'], 'setof record', 'Nearby function exists');
select isnt_empty($$select pg_get_functiondef('public.nearby_spots(double precision,double precision,integer,integer)'::regprocedure) where pg_get_functiondef('public.nearby_spots(double precision,double precision,integer,integer)'::regprocedure) ilike '%st_dwithin%'$$, 'Nearby query uses ST_DWithin');

select * from finish();
rollback;

