-- Convertir les defenseIds de l'ancien format [string] vers le nouveau format [{ defenseId: string, userId: string }]
-- Cette migration convertit les arrays de strings en arrays d'objets avec defenseId et userId (vide pour les anciennes données)
-- Note: Les données existantes auront userId: '' (chaîne vide) pour les anciennes affectations

-- Cette migration est effectuée côté application lors du chargement des données
-- Le code gère automatiquement les deux formats (ancien et nouveau)
-- Aucune modification SQL nécessaire car le format JSON est compatible

