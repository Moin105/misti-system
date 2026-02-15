-- Add country field to chat_conversations table
ALTER TABLE public.chat_conversations 
ADD COLUMN country TEXT;