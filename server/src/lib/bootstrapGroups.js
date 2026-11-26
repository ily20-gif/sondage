import { DataTypes } from "sequelize";
import sequelize from "./sequelize.js";
import { Group } from "../models/index.js";

// sync() ne modifie pas les tables existantes : sur une base créée avant les groupes,
// on ajoute la colonne polls.group_id (idempotent, sans effet si elle existe déjà).
export const ensureGroupSchema = async () => {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable("polls");
  if (!columns.group_id) {
    await qi.addColumn("polls", "group_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "study_groups", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    console.log("Column polls.group_id added");
  }
};

// Bases créées avant la validation des demandes : colonne group_members.status.
// Les membres existants restent « approved ».
export const ensureMemberStatusColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable("group_members");
  if (!columns.status) {
    await qi.addColumn("group_members", "status", {
      type: DataTypes.ENUM("pending", "approved"),
      allowNull: false,
      defaultValue: "approved",
    });
    console.log("Column group_members.status added");
  }
};

// Corrige une première version où DAIA/CISIA étaient sous DUT et les Génie sous Bachelor.
// Ne touche qu'aux groupes qui sont encore sous le mauvais parent (idempotent).
export const fixDefaultGroupLayout = async () => {
  const dut = await Group.findOne({ where: { name: "DUT", parent_id: null } });
  const bachelor = await Group.findOne({ where: { name: "Bachelor", parent_id: null } });
  if (!dut || !bachelor) return;

  const moves = [
    [["DAIA", "CISIA"], dut.id, bachelor.id],
    [["Génie Informatique", "Génie Mécanique"], bachelor.id, dut.id],
  ];
  for (const [names, from, to] of moves) {
    const [count] = await Group.update({ parent_id: to }, { where: { name: names, parent_id: from } });
    if (count) console.log(`Groups moved: ${names.join(", ")}`);
  }
};

// Groupes de départ, créés une seule fois (table vide). L'admin gère la suite depuis /groups.
const DEFAULT_GROUPS = [
  { name: "DUT", children: ["Génie Informatique", "Génie Mécanique"] },
  { name: "Bachelor", children: ["DAIA", "CISIA"] },
];

export const seedDefaultGroups = async () => {
  if ((await Group.count()) > 0) return;
  for (const { name, children } of DEFAULT_GROUPS) {
    const parent = await Group.create({ name });
    for (const child of children) await Group.create({ name: child, parent_id: parent.id });
  }
  console.log("Default groups created");
};
