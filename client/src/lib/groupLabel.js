// « DUT › DAIA » pour un sous-groupe, « DUT » pour un groupe.
// Accepte un groupe de l'API des sondages ({ name, parent }) ou de /groups (à plat, avec parentName).
export const groupLabel = (group) => {
  if (!group) return "";
  const parentName = group.parent?.name || group.parentName;
  return parentName ? `${parentName} › ${group.name}` : group.name;
};
