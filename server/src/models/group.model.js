import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

// Groupe (niveau 1 : DUT, Bachelor...) ou sous-groupe (niveau 2 : DAIA, CISIA...).
// Un sous-groupe référence son parent via parent_id (créé par l'association dans models/index.js).
const Group = sequelize.define(
  "Group",
  {
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: { notEmpty: true },
    },
  },
  { tableName: "study_groups", timestamps: true }
);

export default Group;
