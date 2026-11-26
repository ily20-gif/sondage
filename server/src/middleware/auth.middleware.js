import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export const protectedRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    req.user = user;
    next();

  } catch (error) {
    console.log("Error in protectedRoute middleware:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Invalid token" });
    }

    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access required" });
  }
  next();
};

// Identifie l'utilisateur s'il est connecté, sans bloquer les visiteurs anonymes.
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ["password"] },
      });
      if (user) req.user = user;
    }
  } catch {
    // token invalide ou expiré : on traite la requête comme anonyme
  }
  next();
};
