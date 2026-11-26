import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

// Table 4 de l'énoncé : votes (id, poll_id, user_id, option_id, voted_at)
// poll_id et user_id sont créés par les associations (models/index.js).
const Vote = sequelize.define(
  "Vote",
  {
    // id explicite : sans lui, l'association belongsToMany supprimerait la colonne id
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    option_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    voted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Champ calculé : texte de l'option choisie (nécessite include: PollOption).
    // Permet de garder le même format de réponse pour le frontend.
    option_selected: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.PollOption ? this.PollOption.option_text : null;
      },
    },
  },
  {
    timestamps: false,

    indexes: [
      {
        unique: true,
        fields: ["poll_id", "user_id"],
        name: "unique_vote_per_user_per_poll",
      },
    ],
  }
);

export default Vote;
