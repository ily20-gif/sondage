export const MAX_OPTIONS = 10;
export const MIN_OPTIONS = 2;
export const MAX_OPTION_LENGTH = 100;

// Nettoie et valide la liste des propositions. Retourne { error } ou { clean }.
export const validateOptions = (options) => {
  if (!Array.isArray(options) || options.length < MIN_OPTIONS) {
    return { error: `Au moins ${MIN_OPTIONS} propositions sont requises` };
  }
  if (options.length > MAX_OPTIONS) {
    return { error: `Maximum ${MAX_OPTIONS} propositions` };
  }
  const clean = options.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (clean.some((o) => !o)) {
    return { error: "Les propositions ne peuvent pas être vides" };
  }
  if (clean.some((o) => o.length > MAX_OPTION_LENGTH)) {
    return { error: `Une proposition ne doit pas dépasser ${MAX_OPTION_LENGTH} caractères` };
  }
  if (new Set(clean.map((o) => o.toLowerCase())).size !== clean.length) {
    return { error: "Les propositions doivent être uniques" };
  }
  return { clean };
};

export const validateEndTime = (end_time) => {
  const d = new Date(end_time);
  if (!end_time || !Number.isFinite(d.getTime()) || d <= new Date()) {
    return { error: "La date de clôture doit être dans le futur" };
  }
  return { date: d };
};
