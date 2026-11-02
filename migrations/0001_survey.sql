-- Additive migration: no previous participant data existed in the preview.
CREATE TABLE survey_versions (
  survey_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  definition_json TEXT NOT NULL CHECK (json_valid(definition_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (survey_id, version)
);

CREATE TABLE survey_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  survey_id TEXT NOT NULL,
  survey_version INTEGER NOT NULL,
  consent_version TEXT NOT NULL,
  adult_confirmed INTEGER NOT NULL CHECK (adult_confirmed = 1),
  voluntary_confirmed INTEGER NOT NULL CHECK (voluntary_confirmed = 1),
  uf TEXT CHECK (uf IS NULL OR length(uf) = 2),
  city_id TEXT CHECK (city_id IS NULL OR (length(city_id) = 7 AND uf IS NOT NULL)),
  payload_hash TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (survey_id, survey_version) REFERENCES survey_versions(survey_id, version)
);

CREATE TABLE survey_answers (
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  PRIMARY KEY (submission_id, question_id),
  FOREIGN KEY (submission_id) REFERENCES survey_submissions(id) ON DELETE CASCADE
);

CREATE INDEX submissions_survey_date ON survey_submissions(survey_id, survey_version, submitted_at);
CREATE INDEX submissions_location ON survey_submissions(uf, city_id);
