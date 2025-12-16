-- Harden RLS by explicitly denying user-initiated mutations on sensitive tables.

-- Subscriptions: users may read their own subscription, but must not be able to write subscription status/Stripe IDs.
CREATE POLICY "Deny user inserts on subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny user updates on subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny user deletes on subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);

-- User roles: prevent privilege escalation (roles are managed only by backend services).
CREATE POLICY "Deny user inserts on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny user updates on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false);

CREATE POLICY "Deny user deletes on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);

-- Usage tracking: protect usage integrity (no user deletions).
CREATE POLICY "Deny user deletes on usage_tracking"
ON public.usage_tracking
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);

-- Profiles: prevent profile deletions unless you explicitly want account deletion flows.
CREATE POLICY "Deny user deletes on profiles"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);
