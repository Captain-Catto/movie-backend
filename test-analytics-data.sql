-- Script to insert test analytics data
-- Run this on your production database to populate analytics for testing

-- Insert VIEW events (last 30 days)
INSERT INTO view_analytics (content_id, content_type, action_type, content_title, device_type, created_at)
VALUES
  -- Movies - VIEW events
  ('533535', 'movie', 'VIEW', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'VIEW', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'VIEW', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '2 days'),
  ('519182', 'movie', 'VIEW', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('519182', 'movie', 'VIEW', 'Despicable Me 4', 'tablet', NOW() - INTERVAL '3 days'),
  ('573435', 'movie', 'VIEW', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('573435', 'movie', 'VIEW', 'Bad Boys: Ride or Die', 'mobile', NOW() - INTERVAL '4 days'),
  ('653346', 'movie', 'VIEW', 'Kingdom of the Planet of the Apes', 'desktop', NOW() - INTERVAL '5 days'),
  ('653346', 'movie', 'VIEW', 'Kingdom of the Planet of the Apes', 'mobile', NOW() - INTERVAL '5 days'),
  ('718821', 'movie', 'VIEW', 'Twisters', 'desktop', NOW() - INTERVAL '6 days'),

  -- TV Series - VIEW events
  ('94997', 'tv_series', 'VIEW', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'VIEW', 'House of the Dragon', 'mobile', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'VIEW', 'House of the Dragon', 'tablet', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'VIEW', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'VIEW', 'Loki', 'mobile', NOW() - INTERVAL '3 days'),
  ('95557', 'tv_series', 'VIEW', 'Invincible', 'desktop', NOW() - INTERVAL '4 days'),
  ('95557', 'tv_series', 'VIEW', 'Invincible', 'mobile', NOW() - INTERVAL '5 days'),
  ('100088', 'tv_series', 'VIEW', 'The Last of Us', 'desktop', NOW() - INTERVAL '6 days'),
  ('100088', 'tv_series', 'VIEW', 'The Last of Us', 'tablet', NOW() - INTERVAL '7 days'),
  ('76479', 'tv_series', 'VIEW', 'The Boys', 'mobile', NOW() - INTERVAL '8 days');

-- Insert CLICK events
INSERT INTO view_analytics (content_id, content_type, action_type, content_title, device_type, created_at)
VALUES
  -- Movies - CLICK events
  ('533535', 'movie', 'CLICK', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'CLICK', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('519182', 'movie', 'CLICK', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('573435', 'movie', 'CLICK', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('653346', 'movie', 'CLICK', 'Kingdom of the Planet of the Apes', 'mobile', NOW() - INTERVAL '4 days'),
  ('718821', 'movie', 'CLICK', 'Twisters', 'desktop', NOW() - INTERVAL '5 days'),

  -- TV Series - CLICK events
  ('94997', 'tv_series', 'CLICK', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'CLICK', 'House of the Dragon', 'mobile', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'CLICK', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('95557', 'tv_series', 'CLICK', 'Invincible', 'mobile', NOW() - INTERVAL '3 days'),
  ('100088', 'tv_series', 'CLICK', 'The Last of Us', 'desktop', NOW() - INTERVAL '4 days'),
  ('76479', 'tv_series', 'CLICK', 'The Boys', 'mobile', NOW() - INTERVAL '5 days');

-- Insert PLAY events
INSERT INTO view_analytics (content_id, content_type, action_type, content_title, device_type, created_at)
VALUES
  -- Movies - PLAY events
  ('533535', 'movie', 'PLAY', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'PLAY', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('519182', 'movie', 'PLAY', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('573435', 'movie', 'PLAY', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('653346', 'movie', 'PLAY', 'Kingdom of the Planet of the Apes', 'desktop', NOW() - INTERVAL '4 days'),

  -- TV Series - PLAY events
  ('94997', 'tv_series', 'PLAY', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('84958', 'tv_series', 'PLAY', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('95557', 'tv_series', 'PLAY', 'Invincible', 'mobile', NOW() - INTERVAL '3 days'),
  ('100088', 'tv_series', 'PLAY', 'The Last of Us', 'desktop', NOW() - INTERVAL '4 days'),
  ('76479', 'tv_series', 'PLAY', 'The Boys', 'mobile', NOW() - INTERVAL '5 days');

-- Summary of inserted data:
-- Total VIEW events: 20 (10 movies + 10 TV series)
-- Total CLICK events: 12 (6 movies + 6 TV series)
-- Total PLAY events: 10 (5 movies + 5 TV series)
--
-- This will give you:
-- - Total Views: 20
-- - Total Clicks: 12
-- - Total Plays: 10
-- - CTR: 60%
-- - Device distribution across desktop, mobile, tablet
-- - Data spread across last 8 days for charts
