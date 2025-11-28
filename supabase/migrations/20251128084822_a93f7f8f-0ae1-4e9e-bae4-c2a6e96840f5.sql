-- Add rating and favorite functionality to custom_levels
CREATE TABLE IF NOT EXISTS public.level_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.custom_levels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.level_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.custom_levels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_id, user_id)
);

-- Enable RLS
ALTER TABLE public.level_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for level_ratings
CREATE POLICY "Users can view all ratings"
  ON public.level_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can rate levels"
  ON public.level_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.level_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.level_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for level_favorites
CREATE POLICY "Users can view all favorites"
  ON public.level_favorites FOR SELECT
  USING (true);

CREATE POLICY "Users can favorite levels"
  ON public.level_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfavorite levels"
  ON public.level_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Add average rating column (computed view)
CREATE OR REPLACE VIEW public.level_stats AS
SELECT 
  cl.id,
  cl.name,
  cl.creator_id,
  cl.description,
  cl.difficulty,
  cl.published,
  cl.plays,
  cl.likes,
  cl.created_at,
  cl.level_data,
  COUNT(DISTINCT lr.id) as rating_count,
  COALESCE(AVG(lr.rating), 0) as average_rating,
  COUNT(DISTINCT lf.id) as favorite_count,
  p.username as creator_name
FROM public.custom_levels cl
LEFT JOIN public.level_ratings lr ON cl.id = lr.level_id
LEFT JOIN public.level_favorites lf ON cl.id = lf.level_id
LEFT JOIN public.profiles p ON cl.creator_id = p.id
GROUP BY cl.id, p.username;

-- Grant access to view
GRANT SELECT ON public.level_stats TO authenticated;

-- Add realtime for ratings and favorites
ALTER PUBLICATION supabase_realtime ADD TABLE public.level_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.level_favorites;