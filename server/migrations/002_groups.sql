-- Groupes / sous-groupes (DUT > DAIA, CISIA...) et sondages réservés à un groupe.
-- Facultatif : au démarrage, le serveur crée ces tables et ajoute polls.group_id tout seul
-- (lib/bootstrapGroups.js). Ce script sert si vous préférez migrer à la main.

CREATE TABLE IF NOT EXISTS study_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  parent_id INT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_group_parent FOREIGN KEY (parent_id) REFERENCES study_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  group_id INT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY unique_member_per_group (user_id, group_id),
  CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES Users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_member_group FOREIGN KEY (group_id) REFERENCES study_groups(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- NULL = sondage public ; RESTRICT = impossible de supprimer un groupe qui a des sondages.
ALTER TABLE polls
  ADD COLUMN group_id INT NULL,
  ADD CONSTRAINT fk_poll_group FOREIGN KEY (group_id) REFERENCES study_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
