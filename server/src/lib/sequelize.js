
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    timezone: "+00:00",
    logging: false,
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // sync() creates missing tables but does not alter existing tables by default.
    // Use explicit, reviewed SQL migrations for changes to an existing schema.
    await sequelize.sync();

    // Groupes : colonne polls.group_id sur les anciennes bases + groupes par défaut
    const { ensureGroupSchema, ensureMemberStatusColumn, seedDefaultGroups, fixDefaultGroupLayout } =
      await import("./bootstrapGroups.js");
    await ensureGroupSchema();
    await ensureMemberStatusColumn();
    await seedDefaultGroups();
    await fixDefaultGroupLayout();

    console.log("Database models synchronized");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

export default sequelize;
