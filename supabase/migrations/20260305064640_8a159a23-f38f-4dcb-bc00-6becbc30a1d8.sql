
-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they're part of
CREATE POLICY "Users can view own friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can insert friend requests"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they're addressee of (accept/decline)
CREATE POLICY "Addressee can update friendship status"
ON public.friendships
FOR UPDATE
USING (auth.uid() = addressee_id);

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete own friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Auto-update updated_at
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
