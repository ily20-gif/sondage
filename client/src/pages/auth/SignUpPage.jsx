import { useContext, useEffect, useState, useRef } from "react";
import { axiosInstance } from "../../lib/axios";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import validator from "validator";
import { SignUpButton, useUser, useAuth } from "@clerk/react";
import image from "../../assets/google.svg";
import { fullName } from "../../config/brand";

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const { user: appUser, setUser } = useContext(AuthContext);
  const { user: clerkUser, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const hasProcessedClerk = useRef(false);

  useEffect(() => {
    const handleClerkSignup = async () => {
      if (!isSignedIn || !clerkUser || hasProcessedClerk.current || appUser) {
        return;
      }

      hasProcessedClerk.current = true;

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Clerk session token introuvable");
        }

        const res = await axiosInstance.post(
          "/auth/clerk",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          },
        );

        setUser(res.data);
        toast.success("Inscription avec Google réussie");
        navigate("/");
      } catch (err) {
        console.error("Clerk signup error:", err);
        toast.error(
          err.response?.data?.message || "Échec de l'inscription avec Google",
        );
        hasProcessedClerk.current = false;
      }
    };

    handleClerkSignup();
  }, [isSignedIn, clerkUser, appUser, setUser, navigate, getToken]);

  useEffect(() => {
    if (appUser && !isSignedIn) {
      navigate("/");
    }
  }, [appUser, isSignedIn, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Le nom complet est requis";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Le nom complet doit contenir au moins 2 caractères";
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!validator.isEmail(formData.email)) {
      newErrors.email = "Adresse email invalide";
    }

    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Le mot de passe doit contenir au moins 8 caractères";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password =
        "Le mot de passe doit contenir au moins une lettre minuscule";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password =
        "Le mot de passe doit contenir au moins une lettre majuscule";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Le mot de passe doit contenir au moins un chiffre";
    } else if (!/(?=.*[@$!%*?&#])/.test(formData.password)) {
      newErrors.password =
        "Le mot de passe doit contenir au moins un caractère spécial";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Veuillez confirmer votre mot de passe";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await axiosInstance.post("/auth/signup", formData, {
        withCredentials: true,
      });

      if (res.data.requiresVerification) {
        toast.success(
          res.data.message ||
            "Veuillez vérifier votre email pour confirmer votre compte",
        );
        navigate("/verify-email", {
          state: { email: formData.email },
        });
      } else {
        setUser(res.data);
        toast.success("Compte créé avec succès");
        navigate("/");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'inscription");
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <span className="auth-badge">{fullName}</span>
        <h2>Rejoignez la conversation.</h2>
        <p>Créez votre compte en quelques secondes et donnez votre avis sur ce qui compte.</p>
        <ul>
          <li>🔒 Un seul vote par personne</li>
          <li>⚡ Résultats en temps réel</li>
          <li>✨ Sondages générés par IA</li>
        </ul>
      </aside>
      <div className="auth-main">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center mb-4">
          Créer un compte
        </h2>

        <div className="space-y-3 mb-4">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border py-2 rounded-md hover:bg-gray-50"
            >
              <img src={image} alt="Google" className="w-5 h-5" />
              S'inscrire avec Google
            </button>
          </SignUpButton>

          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-300" />
            OU
            <div className="flex-1 h-px bg-gray-300" />
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-gray-600">Nom complet</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md ${
                errors.fullName ? "border-red-500" : ""
              }`}
            />
            {errors.fullName && (
              <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md ${
                errors.email ? "border-red-500" : ""
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md ${
                errors.password ? "border-red-500" : ""
              }`}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md ${
                errors.confirmPassword ? "border-red-500" : ""
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            S'inscrire
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Vous avez déjà un compte ?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
}
