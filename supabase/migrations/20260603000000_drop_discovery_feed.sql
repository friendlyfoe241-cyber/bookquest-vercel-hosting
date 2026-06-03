-- Drop the discovery_feed table as we've migrated to unlimited local book generation
DROP TABLE IF EXISTS public.discovery_feed CASCADE;
