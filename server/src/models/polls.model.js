import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

const Poll = sequelize.define(
  "Poll",
  {
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Question cannot be empty" },
      },
    },

    // Les propositions sont stockées dans la table poll_options.
    // Champ calculé : tableau de textes (nécessite include: PollOption).
    options: {
      type: DataTypes.VIRTUAL,
      get() {
        const list = this.PollOptions || [];
        return [...list].sort((a, b) => a.id - b.id).map((o) => o.option_text);
      },
    },

    category: {
      type: DataTypes.ENUM("sondage", "vote"),
      allowNull: false,
      defaultValue: "sondage",
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterNow(value) {
          if (new Date(value) <= new Date()) {
            throw new Error("End time must be in the future");
          }
        },
      },
    },

    // draft = brouillon à valider, published = ouvert aux votes, closed = clôturé pending = need to be validated by admin 
    status: {
      type: DataTypes.ENUM("published", "draft", "pending", "closed"),
      allowNull: false,
      defaultValue: "draft",
    },

    // création manuelle ou par IA
    creation_mode: {
      type: DataTypes.ENUM("manual", "ai"),
      allowNull: false,
      defaultValue: "manual",
    },

    results_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    warning_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "polls",
    timestamps: true,
  },
);

export default Poll;
