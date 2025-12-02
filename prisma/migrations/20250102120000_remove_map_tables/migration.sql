-- RemoveMapTables
-- Suppression des tables liées aux maps

-- Supprimer les tables dans l'ordre correct (en respectant les contraintes de clés étrangères)
DROP TABLE IF EXISTS "MapDefense";
DROP TABLE IF EXISTS "MapTowerPosition";
DROP TABLE IF EXISTS "MapNotes";

