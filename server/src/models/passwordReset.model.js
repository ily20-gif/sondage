import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

const PasswordReset = sequelize.define(
  "PasswordReset",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    token_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "password_resets",
  }
);

export default PasswordReset;

