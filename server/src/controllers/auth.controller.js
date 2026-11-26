import { generateToken } from "../lib/utils.js";
import { User, PasswordReset } from "../models/index.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../lib/mailer.js";
import { Op } from "sequelize";
import { emailVerificationTemplate } from "../templates/notif.templates.js";
import { createClerkClient } from "@clerk/backend";
import { APP_NAME } from "../lib/brand.js";

// ============================================
// SIGNUP - Normal Email / Password
// ============================================

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (exists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashed,
      authProvider: "local",
      isEmailVerified: false,
      emailVerificationToken: tokenHash,
      emailVerificationExpires: expiresAt,
    });

    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    const emailContent = emailVerificationTemplate(
      newUser.fullName,
      verificationLink,
    );

    await sendEmail(
      normalizedEmail,
      `Verify Your Email - ${APP_NAME}`,
      emailContent,
      true,
    );

    return res.status(201).json({
      message:
        "Account created! Please check your email to verify your account.",
      requiresVerification: true,
    });
  } catch (err) {
    console.log("Signup error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// LOGIN - Normal Email / Password
// ============================================

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
      });
    }

    generateToken(user.id, res);

    return res.status(200).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.log("Login error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// LOGOUT
// ============================================

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 0,
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.log("Logout error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// CHECK AUTH
// ============================================

export const checkAuth = (req, res) => {
  try {
    return res.status(200).json(req.user || null);
  } catch (err) {
    console.log("CheckAuth error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// CLERK AUTH - Google Login / Signup
// ============================================

export const clerkAuth = async (req, res) => {
  try {
    // 1. Verify Clerk configuration

    if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
      console.error("Clerk keys are missing in server/.env");

      return res.status(500).json({
        message: "Configuration Clerk manquante",
      });
    }

    // 2. Get Clerk session token

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token Clerk manquant",
      });
    }

    // 3. Create Clerk client

    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });

    // 4. Build request for Clerk verification

    const clerkRequest = new Request(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      {
        method: req.method,
        headers: {
          Authorization: authHeader,
          ...(req.headers.origin && {
            Origin: req.headers.origin,
          }),
        },
      },
    );

    // 5. Verify Clerk session

    const authState = await clerkClient.authenticateRequest(clerkRequest, {
      authorizedParties: [process.env.CLIENT_URL || "http://localhost:5173"],
    });

    if (!authState.isAuthenticated) {
      return res.status(401).json({
        message: "Session Clerk invalide ou expirée",
      });
    }

    // 6. Get verified Clerk user ID

    const { userId } = authState.toAuth();

    if (!userId) {
      return res.status(401).json({
        message: "Utilisateur Clerk introuvable",
      });
    }

    // 7. Get user information directly from Clerk

    const clerkUser = await clerkClient.users.getUser(userId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (item) => item.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
      return res.status(403).json({
        message: "Adresse email Clerk non vérifiée",
      });
    }

    const email = primaryEmail.emailAddress.toLowerCase();

    const fullName =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      email.split("@")[0];

    // 8. Find existing user in database

    let user = await User.findOne({
      where: { email },
    });

    if (!user) {
      // Create new Google / Clerk user
      // No password is required for Clerk authentication

      user = await User.create({
        fullName,
        email,
        password: null,
        authProvider: "clerk",
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });
    } else if (!user.isEmailVerified) {
      // Clerk confirmed that this email is verified.
      // Keep the existing authentication provider.

      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });
    }

    // 9. Generate application JWT

    generateToken(user.id, res);

    return res.status(200).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      image: user.image,
    });
  } catch (err) {
    console.error("Clerk auth error:", err);

    return res.status(500).json({
      message: "Erreur lors de l'authentification Clerk",
    });
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    // Only local users can reset their application password

    if (user && user.authProvider === "local" && user.password) {
      const resetToken = crypto.randomBytes(32).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await PasswordReset.create({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });

      const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";

      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello ${user.fullName},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This link will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      `;

      await sendEmail(
        normalizedEmail,
        `Password Reset Request - ${APP_NAME}`,
        emailContent,
        true,
      );
    }

    // Same response whether email exists or not

    return res.status(200).json({
      message:
        "If the account supports password reset, an email has been sent.",
    });
  } catch (err) {
    console.log("Forgot password error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// RESET PASSWORD
// ============================================

export const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    if (!email || !token || !newPassword) {
      return res.status(400).json({
        message: "Email, token, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const passwordReset = await PasswordReset.findOne({
      where: {
        token_hash: tokenHash,
        expires_at: {
          [Op.gt]: new Date(),
        },
        used: false,
      },
      include: [
        {
          model: User,
          where: {
            email: normalizedEmail,
            authProvider: "local",
          },
          attributes: ["id", "email", "authProvider"],
        },
      ],
    });

    if (!passwordReset) {
      return res.status(400).json({
        message:
          "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.update(
      {
        password: hashedPassword,
      },
      {
        where: {
          id: passwordReset.user_id,
          authProvider: "local",
        },
      },
    );

    await PasswordReset.update(
      {
        used: true,
      },
      {
        where: {
          id: passwordReset.id,
        },
      },
    );

    return res.status(200).json({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.log("Reset password error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// VERIFY EMAIL
// ============================================

export const verifyEmail = async (req, res) => {
  const { email, token } = req.body;

  try {
    if (!email || !token) {
      return res.status(400).json({
        message: "Email and token are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
        authProvider: "local",
        emailVerificationToken: tokenHash,
        emailVerificationExpires: {
          [Op.gt]: new Date(),
        },
        isEmailVerified: false,
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid or expired verification token. Please request a new verification email.",
      });
    }

    await User.update(
      {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
      {
        where: { id: user.id },
      },
    );

    generateToken(user.id, res);

    return res.status(200).json({
      message: "Email verified successfully!",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    console.log("Verify email error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({
        message: "This account uses Google authentication.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await User.update(
      {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: expiresAt,
      },
      {
        where: { id: user.id },
      },
    );

    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    const emailContent = emailVerificationTemplate(
      user.fullName,
      verificationLink,
    );

    await sendEmail(
      normalizedEmail,
      `Verify Your Email - ${APP_NAME}`,
      emailContent,
      true,
    );

    return res.status(200).json({
      message: "Verification email has been sent. Please check your inbox.",
    });
  } catch (err) {
    console.log("Resend verification error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
