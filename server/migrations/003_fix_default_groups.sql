-- Corrige les groupes par défaut déjà créés : DAIA et CISIA passent sous Bachelor.
-- Les sondages et membres liés à DAIA / CISIA sont conservés (seul le parent change).
UPDATE study_groups
SET parent_id = (SELECT id FROM (SELECT id FROM study_groups WHERE name = 'Bachelor' AND parent_id IS NULL LIMIT 1) AS b)
WHERE name IN ('DAIA', 'CISIA')
  AND parent_id = (SELECT id FROM (SELECT id FROM study_groups WHERE name = 'DUT' AND parent_id IS NULL LIMIT 1) AS d);
