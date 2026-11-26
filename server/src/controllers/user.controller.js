import { User } from "../models/index.js";
import bcrypt from "bcrypt";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import sequelize from "../lib/sequelize.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // L'email n'est pas modifiable ici (il est vérifié à l'inscription).
    const { fullName, password } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (typeof fullName === "string" && fullName.trim()) {
      user.fullName = fullName.trim().slice(0, 100);
    }

    if (password) {
      if (user.authProvider !== "local") {
        return res
          .status(400)
          .json({ message: "Ce compte utilise la connexion Google." });
      }
      if (typeof password !== "string" || password.length < 6)
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });

      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    generateToken(user.id, res);

    res.status(200).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.log("updateProfile error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changeProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(503).json({ message: "Le service de stockage des images n'est pas configuré." });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert Cloudinary's callback stream to a Promise so upload/database errors
    // are handled by this try/catch instead of becoming unhandled rejections.
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "sondageonline/profile-images",
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit" }],
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    user.image = result.secure_url;
    await user.save();

    return res.status(200).json({
      message: "Profile image updated successfully",
      image: user.image,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("changeProfileImage error:", error.message);
    return res.status(500).json({
      message: "Impossible de mettre à jour la photo de profil. Réessayez.",
    });
  }
};

export const deleteAccount = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Delete the user.
    // Associated records are deleted through database CASCADE constraints.
    await User.destroy({
      where: { id: userId },
      transaction,
    });

    await transaction.commit();

    // Clear authentication cookie
    res.clearCookie("jwt");

    return res.status(200).json({
      message: "Account and associated data deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();

    console.error("deleteAccount error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

