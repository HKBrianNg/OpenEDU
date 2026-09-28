CREATE OR REPLACE FUNCTION ping()
RETURNS json AS $$
  SELECT json_build_object('now', now());
$$ LANGUAGE sql;