CREATE TABLE community_prayers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  initial text NOT NULL,
  text text NOT NULL,
  tag text NOT NULL,
  praying_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_prayers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read"
ON community_prayers
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert"
ON community_prayers
FOR INSERT
WITH CHECK (true);
