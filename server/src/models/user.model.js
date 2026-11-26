
import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // local = Email/Password
    // clerk = Google/Clerk
    authProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "local",
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },

    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default User;
