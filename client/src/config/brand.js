// Identité de l'application : modifiez ici le nom, le slogan et le logo.
export const brand = {
  // Nom affiché en deux parties (la 2e est colorée). Ex. "OPI" + "NOVA".
  name: "OPI",
  accent: "NOVA",
  slogan: "YOUR OPINION, YOUR IMPACT.",
  // Logo : mettez l'image dans client/public/ puis indiquez son chemin, ex. "/logo.svg".
  // null = icône par défaut.
  logo: "/logo.svg",
};

export const fullName = `${brand.name}${brand.accent}`;
