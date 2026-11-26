import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary sert uniquement à l'upload de la photo de profil :
// s'il n'est pas configuré, le serveur démarre quand même.
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.api
    .ping()
    .then(() => console.log("Cloudinary connected successfully"))
    .catch((error) => console.error("Cloudinary connection error:", error.message));
} else {
  console.warn("Cloudinary non configuré (CLOUDINARY_* absents du .env) : upload d'image désactivé.");
}

export default cloudinary;
