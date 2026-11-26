import { Group, GroupMember } from "../models/index.js";

// Ids des groupes auxquels l'utilisateur a accès : ses groupes + leurs parents.
// Ex. membre de DAIA => accès aux sondages de DAIA et à ceux de tout le DUT,
// mais pas à ceux de CISIA.
export const getAccessibleGroupIds = async (userId) => {
  const [groups, memberships] = await Promise.all([
    Group.findAll({ attributes: ["id", "parent_id"], raw: true }),
    GroupMember.findAll({
      where: { user_id: userId, status: "approved" },
      attributes: ["group_id"],
      raw: true,
    }),
  ]);
  const parentOf = new Map(groups.map((g) => [Number(g.id), g.parent_id == null ? null : Number(g.parent_id)]));

  const ids = new Set();
  for (const { group_id } of memberships) {
    let current = Number(group_id);
    while (current != null && !ids.has(current)) {
      ids.add(current);
      current = parentOf.get(current) ?? null;
    }
  }
  return ids;
};

// true si le sondage est public (groupId vide), si l'utilisateur est admin,
// ou s'il appartient au groupe (ou à l'un de ses sous-groupes).
export const canAccessGroup = async (user, groupId) => {
  if (groupId == null) return true;
  if (!user) return false;
  if (user.role === "admin") return true;
  const ids = await getAccessibleGroupIds(user.id);
  return ids.has(Number(groupId));
};
