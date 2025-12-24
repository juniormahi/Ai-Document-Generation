-- Update the increment_usage function to support variable credit amounts
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id text, _usage_type text, _amount integer DEFAULT 1)
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
    CASE WHEN _usage_type = 'documents' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'chat' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'presentations' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'spreadsheets' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'voiceovers' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'images' THEN _amount ELSE 0 END,
    CASE WHEN _usage_type = 'videos' THEN _amount ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    documents_generated = CASE WHEN _usage_type = 'documents' THEN usage_tracking.documents_generated + _amount ELSE usage_tracking.documents_generated END,
    chat_messages = CASE WHEN _usage_type = 'chat' THEN usage_tracking.chat_messages + _amount ELSE usage_tracking.chat_messages END,
    presentations_generated = CASE WHEN _usage_type = 'presentations' THEN usage_tracking.presentations_generated + _amount ELSE usage_tracking.presentations_generated END,
    spreadsheets_generated = CASE WHEN _usage_type = 'spreadsheets' THEN usage_tracking.spreadsheets_generated + _amount ELSE usage_tracking.spreadsheets_generated END,
    voiceovers_generated = CASE WHEN _usage_type = 'voiceovers' THEN usage_tracking.voiceovers_generated + _amount ELSE usage_tracking.voiceovers_generated END,
    images_generated = CASE WHEN _usage_type = 'images' THEN usage_tracking.images_generated + _amount ELSE usage_tracking.images_generated END,
    videos_generated = CASE WHEN _usage_type = 'videos' THEN usage_tracking.videos_generated + _amount ELSE usage_tracking.videos_generated END,
    updated_at = now();
END;
$function$;

-- Add books_generated column to usage_tracking for the new AI Book Creator
ALTER TABLE public.usage_tracking 
ADD COLUMN IF NOT EXISTS books_generated integer NOT NULL DEFAULT 0;