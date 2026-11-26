import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

// Table 3 de l'énoncé : poll_options (id, poll_id, option_text)
const PollOption = sequelize.define(
  "PollOption",
  {
    option_text: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true },
    },
  },
  { tableName: "poll_options", timestamps: true }
);

export default PollOption;
