-- Create a function to get user role that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;