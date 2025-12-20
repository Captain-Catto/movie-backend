-- Script to insert test analytics data with correct column names
-- Run this on your production database to populate analytics for testing

-- Insert VIEW events (last 30 days)
INSERT INTO view_analytics ("contentId", "contentType", "actionType", "contentTitle", "deviceType", "createdAt")
VALUES
  -- Movies - VIEW events
  ('533535', 'movie', 'view', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'view', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'view', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '2 days'),
  ('519182', 'movie', 'view', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('519182', 'movie', 'view', 'Despicable Me 4', 'tablet', NOW() - INTERVAL '3 days'),
  ('573435', 'movie', 'view', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('573435', 'movie', 'view', 'Bad Boys: Ride or Die', 'mobile', NOW() - INTERVAL '4 days'),
  ('653346', 'movie', 'view', 'Kingdom of the Planet of the Apes', 'desktop', NOW() - INTERVAL '5 days'),
  ('653346', 'movie', 'view', 'Kingdom of the Planet of the Apes', 'mobile', NOW() - INTERVAL '5 days'),
  ('718821', 'movie', 'view', 'Twisters', 'desktop', NOW() - INTERVAL '6 days'),

  -- TV Series - VIEW events
  ('94997', 'tv_series', 'view', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'view', 'House of the Dragon', 'mobile', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'view', 'House of the Dragon', 'tablet', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'view', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'view', 'Loki', 'mobile', NOW() - INTERVAL '3 days'),
  ('95557', 'tv_series', 'view', 'Invincible', 'desktop', NOW() - INTERVAL '4 days'),
  ('95557', 'tv_series', 'view', 'Invincible', 'mobile', NOW() - INTERVAL '5 days'),
  ('100088', 'tv_series', 'view', 'The Last of Us', 'desktop', NOW() - INTERVAL '6 days'),
  ('100088', 'tv_series', 'view', 'The Last of Us', 'tablet', NOW() - INTERVAL '7 days'),
  ('76479', 'tv_series', 'view', 'The Boys', 'mobile', NOW() - INTERVAL '8 days');

-- Insert CLICK events
INSERT INTO view_analytics ("contentId", "contentType", "actionType", "contentTitle", "deviceType", "createdAt")
VALUES
  -- Movies - CLICK events
  ('533535', 'movie', 'click', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'click', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('519182', 'movie', 'click', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('573435', 'movie', 'click', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('653346', 'movie', 'click', 'Kingdom of the Planet of the Apes', 'mobile', NOW() - INTERVAL '4 days'),
  ('718821', 'movie', 'click', 'Twisters', 'desktop', NOW() - INTERVAL '5 days'),

  -- TV Series - CLICK events
  ('94997', 'tv_series', 'click', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('94997', 'tv_series', 'click', 'House of the Dragon', 'mobile', NOW() - INTERVAL '2 days'),
  ('84958', 'tv_series', 'click', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('95557', 'tv_series', 'click', 'Invincible', 'mobile', NOW() - INTERVAL '3 days'),
  ('100088', 'tv_series', 'click', 'The Last of Us', 'desktop', NOW() - INTERVAL '4 days'),
  ('76479', 'tv_series', 'click', 'The Boys', 'mobile', NOW() - INTERVAL '5 days');

-- Insert PLAY events
INSERT INTO view_analytics ("contentId", "contentType", "actionType", "contentTitle", "deviceType", "createdAt")
VALUES
  -- Movies - PLAY events
  ('533535', 'movie', 'play', 'Deadpool & Wolverine', 'desktop', NOW() - INTERVAL '1 day'),
  ('533535', 'movie', 'play', 'Deadpool & Wolverine', 'mobile', NOW() - INTERVAL '1 day'),
  ('519182', 'movie', 'play', 'Despicable Me 4', 'mobile', NOW() - INTERVAL '2 days'),
  ('573435', 'movie', 'play', 'Bad Boys: Ride or Die', 'desktop', NOW() - INTERVAL '3 days'),
  ('653346', 'movie', 'play', 'Kingdom of the Planet of the Apes', 'desktop', NOW() - INTERVAL '4 days'),

  -- TV Series - PLAY events
  ('94997', 'tv_series', 'play', 'House of the Dragon', 'desktop', NOW() - INTERVAL '1 day'),
  ('84958', 'tv_series', 'play', 'Loki', 'desktop', NOW() - INTERVAL '2 days'),
  ('95557', 'tv_series', 'play', 'Invincible', 'mobile', NOW() - INTERVAL '3 days'),
  ('100088', 'tv_series', 'play', 'The Last of Us', 'desktop', NOW() - INTERVAL '4 days'),
  ('76479', 'tv_series', 'play', 'The Boys', 'mobile', NOW() - INTERVAL '5 days');

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
