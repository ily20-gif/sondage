import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import validator from "validator";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) setErrors({ ...errors, email: "" });
  };

  const validateEmail = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!validator.isEmail(email)) {
      newErrors.email = "Adresse email invalide";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      setIsSubmitted(true);
      toast.success("Un lien de réinitialisation du mot de passe a été envoyé.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'envoi de l'email de réinitialisation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center mb-4">
          Mot de passe oublié
        </h2>

        {isSubmitted ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Nous avons envoyé un lien de réinitialisation du mot de passe à votre email.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Veuillez vérifier votre boîte de réception et suivre les instructions pour réinitialiser votre mot de passe.
            </p>
            <Link
              to="/login"
              className="text-blue-600 hover:underline text-sm"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 text-center mb-4">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  className={`w-full mt-1 p-2 border rounded-md focus:ring focus:ring-blue-300 ${
                    errors.email ? "border-red-500" : ""
                  }`}
                  placeholder="Entrez votre email"
                  required
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
              </button>
            </form>

            <p className="text-sm text-center mt-4 text-gray-600">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

