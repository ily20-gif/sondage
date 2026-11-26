import multer from "multer";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = /\.(jpe?g|png|webp)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const validMime = allowedMimeTypes.has(file.mimetype);
    const validExtension = allowedExtensions.test(file.originalname);

    if (validMime && validExtension) return cb(null, true);
    return cb(new Error("Format non autorisé. Utilisez JPG, PNG ou WEBP."));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
