CREATE TABLE IF NOT EXISTS watch_parties (
  id SERIAL PRIMARY KEY,
  invite_code varchar(10) NOT NULL UNIQUE,
  host_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id integer NULL,
  tv_id integer NULL,
  season integer NULL,
  episode integer NULL,
  stream_url text NOT NULL,
  content_title varchar(255) NOT NULL,
  poster_url text NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_parties_invite_code
  ON watch_parties(invite_code);

CREATE INDEX IF NOT EXISTS idx_watch_parties_host_active
  ON watch_parties(host_id, is_active);
