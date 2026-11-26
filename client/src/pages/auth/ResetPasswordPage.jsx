import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      toast.error("Lien de réinitialisation invalide. Veuillez demander une nouvelle réinitialisation du mot de passe.");
      navigate("/forgot-password");
    }
  }, [token, email, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
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

    if (!token || !email) {
      toast.error("Lien de réinitialisation invalide");
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/reset-password", {
        email,
        token,
        newPassword: formData.password,
      });
      setIsSuccess(true);
      toast.success("Le mot de passe a été réinitialisé avec succès !");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de la réinitialisation du mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold text-center mb-4">
            Réinitialisation du mot de passe réussie
          </h2>
          <p className="text-gray-600 mb-4">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center mb-4">
          Réinitialiser le mot de passe
        </h2>

        <p className="text-sm text-gray-600 text-center mb-4">
          Entrez votre nouveau mot de passe ci-dessous.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <label className="text-sm text-gray-600">Nouveau mot de passe</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md pr-10 focus:ring focus:ring-blue-300 ${
                errors.password ? "border-red-500" : ""
              }`}
              placeholder="Entrez le nouveau mot de passe"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          <div className="relative">
            <label className="text-sm text-gray-600">Confirmer le mot de passe</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full mt-1 p-2 border rounded-md pr-10 focus:ring focus:ring-blue-300 ${
                errors.confirmPassword ? "border-red-500" : ""
              }`}
              placeholder="Confirmer le nouveau mot de passe"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showConfirmPassword ? (
                <EyeOffIcon size={18} />
              ) : (
                <EyeIcon size={18} />
              )}
            </button>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Vous vous souvenez de votre mot de passe ?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

