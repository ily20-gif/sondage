import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { SignInButton, useUser, useAuth } from "@clerk/react";
import { axiosInstance } from "../../lib/axios";
import image from "../../assets/google.svg";
import { fullName } from "../../config/brand";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { user: appUser, setUser } = useContext(AuthContext);
  const { user: clerkUser, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const hasProcessedClerk = useRef(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axiosInstance.post("/auth/login", formData, {
        withCredentials: true,
      });

      setUser(res.data);

      toast.success("Connexion réussie");

      if (res.data.role === "admin") {
        navigate("/polls/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setUnverifiedEmail(formData.email);
        setShowVerificationMessage(true);
      }

      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleResendVerification = async () => {
    try {
      await axiosInstance.post("/auth/resend-verification", {
        email: unverifiedEmail,
      });
      toast.success(
        "Email de vérification envoyé ! Veuillez vérifier votre boîte de réception.",
      );
      setShowVerificationMessage(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Échec de l'envoi de l'email de vérification",
      );
    }
  };

  useEffect(() => {
    const loginClerk = async () => {
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
        toast.success("Connexion avec Google réussie");
        navigate(res.data.role === "admin" ? "/polls/dashboard" : "/");
      } catch (err) {
        console.error("Clerk login error:", err);
        toast.error("Échec de la connexion avec Google");
        hasProcessedClerk.current = false;
      }
    };

    loginClerk();
  }, [isSignedIn, clerkUser, appUser, setUser, navigate, getToken]);

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <span className="auth-badge">{fullName}</span>
        <h2>Content de vous revoir.</h2>
        <p>Connectez-vous pour voter, créer vos sondages et suivre les résultats en direct.</p>
        <ul>
          <li>🔒 Un seul vote par personne</li>
          <li>⚡ Résultats en temps réel</li>
          <li>✨ Sondages générés par IA</li>
        </ul>
      </aside>
      <div className="auth-main">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center mb-4">Connexion</h2>

        <div className="space-y-3 mb-4">
          <SignInButton mode="modal">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border py-2 rounded-md hover:bg-gray-50"
            >
              <img src={image} alt="Google" className="w-5 h-5" />
              Se connecter avec Google
            </button>
          </SignInButton>

          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-300" />
            OU
            <div className="flex-1 h-px bg-gray-300" />
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <div className="relative">
            <label className="text-sm text-gray-600">Mot de passe</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md pr-10 focus:ring focus:ring-blue-300"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {showVerificationMessage && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                Veuillez vérifier votre email avant de vous connecter.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm text-blue-600 hover:underline"
              >
                Renvoyer l'email de vérification
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Se connecter
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Vous n'avez pas de compte ?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
}
