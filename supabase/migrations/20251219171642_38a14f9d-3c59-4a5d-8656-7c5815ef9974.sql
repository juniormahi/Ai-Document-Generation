-- Add videos_generated column to usage_tracking table
ALTER TABLE public.usage_tracking 
ADD COLUMN IF NOT EXISTS videos_generated integer NOT NULL DEFAULT 0;

-- Update the increment_usage function to handle videos
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id text, _usage_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usage_tracking (user_id, date, documents_generated, chat_messages, presentations_generated, spreadsheets_generated, voiceovers_generated, images_generated, videos_generated)
  VALUES (
    _user_id,
    CURRENT_DATE,
    CASE WHEN _usage_type = 'documents' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'chat' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'presentations' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'spreadsheets' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'voiceovers' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'images' THEN 1 ELSE 0 END,
    CASE WHEN _usage_type = 'videos' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    documents_generated = CASE WHEN _usage_type = 'documents' THEN usage_tracking.documents_generated + 1 ELSE usage_tracking.documents_generated END,
    chat_messages = CASE WHEN _usage_type = 'chat' THEN usage_tracking.chat_messages + 1 ELSE usage_tracking.chat_messages END,
    presentations_generated = CASE WHEN _usage_type = 'presentations' THEN usage_tracking.presentations_generated + 1 ELSE usage_tracking.presentations_generated END,
    spreadsheets_generated = CASE WHEN _usage_type = 'spreadsheets' THEN usage_tracking.spreadsheets_generated + 1 ELSE usage_tracking.spreadsheets_generated END,
    voiceovers_generated = CASE WHEN _usage_type = 'voiceovers' THEN usage_tracking.voiceovers_generated + 1 ELSE usage_tracking.voiceovers_generated END,
    images_generated = CASE WHEN _usage_type = 'images' THEN usage_tracking.images_generated + 1 ELSE usage_tracking.images_generated END,
    videos_generated = CASE WHEN _usage_type = 'videos' THEN usage_tracking.videos_generated + 1 ELSE usage_tracking.videos_generated END,
    updated_at = now();
END;
$function$;

-- Update check_usage_limit to handle videos
CREATE OR REPLACE FUNCTION public.check_usage_limit(_user_id text, _limit_type text, _free_limit integer, _premium_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_usage INTEGER;
  user_role app_role;
  usage_limit INTEGER;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id;
  
  IF user_role = 'premium' THEN
    usage_limit := _premium_limit;
  ELSE
    usage_limit := _free_limit;
  END IF;
  
  SELECT COALESCE(
    CASE _limit_type
      WHEN 'documents' THEN documents_generated
      WHEN 'chat' THEN chat_messages
      WHEN 'presentations' THEN presentations_generated
      WHEN 'spreadsheets' THEN spreadsheets_generated
      WHEN 'voiceovers' THEN voiceovers_generated
      WHEN 'images' THEN images_generated
      WHEN 'videos' THEN videos_generated
    END, 0
  ) INTO current_usage
  FROM public.usage_tracking
  WHERE user_id = _user_id AND date = CURRENT_DATE;
  
  RETURN current_usage < usage_limit OR usage_limit = -1;
END;
$function$;