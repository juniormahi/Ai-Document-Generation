-- Create user_preferences table to store notification and app preferences
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  -- Notification preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  product_updates BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  billing_updates BOOLEAN NOT NULL DEFAULT true,
  -- App preferences
  auto_save BOOLEAN NOT NULL DEFAULT true,
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = user_id));

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = user_id));

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = user_id));

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();