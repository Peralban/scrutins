CREATE TABLE groupe (
  id      TEXT PRIMARY KEY,
  sigle   TEXT NOT NULL,
  nom     TEXT NOT NULL,
  couleur TEXT
);
CREATE TABLE depute (
  id     TEXT PRIMARY KEY,
  prenom TEXT NOT NULL,
  nom    TEXT NOT NULL
);
CREATE TABLE scrutin (
  id                TEXT PRIMARY KEY,
  numero            INTEGER NOT NULL,
  date              TEXT NOT NULL,
  type              TEXT NOT NULL,
  sort              TEXT NOT NULL,
  titre             TEXT NOT NULL,
  texte             TEXT,
  etape             TEXT,
  kind              TEXT NOT NULL,
  votants           INTEGER NOT NULL,
  suffrages_exprimes INTEGER NOT NULL,
  pour              INTEGER NOT NULL,
  contre            INTEGER NOT NULL,
  abstentions       INTEGER NOT NULL,
  non_votants       INTEGER NOT NULL,
  dossier           TEXT  -- dossier législatif (DLR…), when the source gives one
);
-- position: 'pour' | 'contre' | 'abstention' | 'non_votant'
CREATE TABLE vote (
  scrutin_id TEXT NOT NULL,
  depute_id  TEXT NOT NULL,
  groupe_id  TEXT NOT NULL,
  position   TEXT NOT NULL,
  delegation INTEGER NOT NULL,
  place      INTEGER,
  PRIMARY KEY (scrutin_id, depute_id)
) WITHOUT ROWID;
CREATE INDEX vote_groupe ON vote (groupe_id, scrutin_id);
CREATE INDEX vote_depute ON vote (depute_id);
CREATE INDEX scrutin_date ON scrutin (date);

-- Group size per scrutin as declared in the source (denominator for participation).
CREATE TABLE effectif (
  scrutin_id TEXT NOT NULL,
  groupe_id  TEXT NOT NULL,
  membres    INTEGER NOT NULL
);
CREATE INDEX effectif_groupe ON effectif (groupe_id);

CREATE TABLE theme (id TEXT PRIMARY KEY, label TEXT NOT NULL);
CREATE TABLE scrutin_theme (scrutin_id TEXT NOT NULL, theme_id TEXT NOT NULL, PRIMARY KEY (scrutin_id, theme_id)) WITHOUT ROWID;
CREATE INDEX scrutin_theme_theme ON scrutin_theme (theme_id);
-- Who sat where, over which dates (non-delegated votes only: the place is the voter's own).
CREATE TABLE siege (place INTEGER NOT NULL, depute_id TEXT NOT NULL, debut TEXT NOT NULL, fin TEXT NOT NULL, votes INTEGER NOT NULL);
CREATE INDEX siege_place ON siege (place);
