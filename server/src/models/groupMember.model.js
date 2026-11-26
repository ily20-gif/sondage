import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

// Appartenance d'un utilisateur à un groupe / sous-groupe.
// user_id et group_id sont créés par les associations (models/index.js).
const GroupMember = sequelize.define(
  "GroupMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // pending = demande en attente de validation par un admin ; approved = membre
    status: {
      type: DataTypes.ENUM("pending", "approved"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "group_members",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["user_id", "group_id"], name: "unique_member_per_group" },
    ],
  }
);

export default GroupMember;
