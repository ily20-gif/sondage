-- Validation des demandes d'adhésion. Facultatif : le serveur ajoute la colonne tout seul au démarrage.
-- Les membres déjà inscrits restent approuvés.
ALTER TABLE group_members
  ADD COLUMN status ENUM('pending','approved') NOT NULL DEFAULT 'approved';
