
import User from "./user.model.js";
import Poll from "./polls.model.js";
import Vote from "./vote.model.js";
import PollOption from "./pollOption.model.js";
import Notification from "./notifications.model.js";
import Chat from "./chat.model.js";
import PasswordReset from "./passwordReset.model.js";
import Group from "./group.model.js";
import GroupMember from "./groupMember.model.js";

// ==================== USER <-> POLL ====================
// When a user is deleted, their polls are deleted automatically.

User.hasMany(Poll, {
  foreignKey: "created_by",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Poll.belongsTo(User, {
  foreignKey: "created_by",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== POLL <-> VOTE ====================

Poll.hasMany(Vote, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Vote.belongsTo(Poll, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== USER <-> VOTE ====================

User.hasMany(Vote, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Vote.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== MANY-TO-MANY USER <-> POLL ====================

User.belongsToMany(Poll, {
  through: Vote,
  foreignKey: "user_id",
});

Poll.belongsToMany(User, {
  through: Vote,
  foreignKey: "poll_id",
});

// ==================== POLL <-> POLL OPTION ====================

Poll.hasMany(PollOption, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

PollOption.belongsTo(Poll, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== POLL OPTION <-> VOTE ====================

PollOption.hasMany(Vote, {
  foreignKey: "option_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Vote.belongsTo(PollOption, {
  foreignKey: "option_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== POLL <-> CHAT ====================

Poll.hasMany(Chat, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Chat.belongsTo(Poll, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== USER <-> CHAT ====================

User.hasMany(Chat, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Chat.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== POLL <-> NOTIFICATION ====================

Poll.hasMany(Notification, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Notification.belongsTo(Poll, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== USER <-> PASSWORD RESET ====================

User.hasMany(PasswordReset, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

PasswordReset.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== GROUP <-> GROUP (parent / sous-groupes) ====================
// Un seul niveau de sous-groupes (DUT > DAIA). Supprimer un parent supprime ses sous-groupes.

Group.hasMany(Group, {
  as: "children",
  foreignKey: "parent_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Group.belongsTo(Group, {
  as: "parent",
  foreignKey: "parent_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ==================== USER <-> GROUP (membres) ====================

User.hasMany(GroupMember, { foreignKey: "user_id", onDelete: "CASCADE", onUpdate: "CASCADE" });
GroupMember.belongsTo(User, { foreignKey: "user_id", onDelete: "CASCADE", onUpdate: "CASCADE" });

Group.hasMany(GroupMember, { foreignKey: "group_id", onDelete: "CASCADE", onUpdate: "CASCADE" });
GroupMember.belongsTo(Group, { foreignKey: "group_id", onDelete: "CASCADE", onUpdate: "CASCADE" });

// ==================== GROUP <-> POLL ====================
// group_id NULL = sondage public. RESTRICT : on ne supprime pas un groupe qui a des sondages
// (sinon ils deviendraient publics par erreur).

Group.hasMany(Poll, {
  foreignKey: { name: "group_id", allowNull: true },
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

Poll.belongsTo(Group, {
  foreignKey: { name: "group_id", allowNull: true },
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

// ==================== EXPORTS ====================

export {
  User,
  Poll,
  PollOption,
  Vote,
  Notification,
  Chat,
  PasswordReset,
  Group,
  GroupMember,
};
