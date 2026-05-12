
CREATE OR REPLACE FUNCTION public.search_profiles_by_name(query text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name
    FROM public.profiles p
    WHERE p.display_name ILIKE '%' || query || '%'
    LIMIT 10;
END;
$$;
