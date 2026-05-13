-- Allow actor/person searches in recent_searches.type
ALTER TYPE recent_searches_type_enum ADD VALUE IF NOT EXISTS 'person';
