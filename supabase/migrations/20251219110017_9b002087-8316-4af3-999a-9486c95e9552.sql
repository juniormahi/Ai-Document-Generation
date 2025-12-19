-- Fix RLS policies to add explicit null checks for auth.uid()

-- Drop and recreate policies for file_history
DROP POLICY IF EXISTS "Users can view their own files" ON public.file_history;
DROP POLICY IF EXISTS "Users can create their own files" ON public.file_history;
DROP POLICY IF EXISTS "Users can update their own files" ON public.file_history;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.file_history;

CREATE POLICY "Users can view their own files" ON public.file_history
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can create their own files" ON public.file_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can update their own files" ON public.file_history
FOR UPDATE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own files" ON public.file_history
FOR DELETE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

-- Drop and recreate policies for generated_files
DROP POLICY IF EXISTS "Users can view their own files" ON public.generated_files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.generated_files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.generated_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.generated_files;

CREATE POLICY "Users can view their own files" ON public.generated_files
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can create their own files" ON public.generated_files
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can update their own files" ON public.generated_files
FOR UPDATE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own files" ON public.generated_files
FOR DELETE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

-- Drop and recreate policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny user deletes on profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Deny user deletes on profiles" ON public.profiles
FOR DELETE USING (false);

-- Drop and recreate policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny user inserts on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny user updates on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny user deletes on subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Deny user inserts on subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny user updates on subscriptions" ON public.subscriptions
FOR UPDATE USING (false);

CREATE POLICY "Deny user deletes on subscriptions" ON public.subscriptions
FOR DELETE USING (false);

-- Drop and recreate policies for usage_tracking
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Deny user deletes on usage_tracking" ON public.usage_tracking;

CREATE POLICY "Users can view their own usage" ON public.usage_tracking
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own usage" ON public.usage_tracking
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Users can update their own usage" ON public.usage_tracking
FOR UPDATE USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Deny user deletes on usage_tracking" ON public.usage_tracking
FOR DELETE USING (false);

-- Drop and recreate policies for user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Deny user inserts on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny user updates on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny user deletes on user_roles" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id);

CREATE POLICY "Deny user inserts on user_roles" ON public.user_roles
FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny user updates on user_roles" ON public.user_roles
FOR UPDATE USING (false);

CREATE POLICY "Deny user deletes on user_roles" ON public.user_roles
FOR DELETE USING (false);