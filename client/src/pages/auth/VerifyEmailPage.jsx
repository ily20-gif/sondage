import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");

  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (token && emailParam) {
      verifyEmail();
    }
  }, [token, emailParam]);

  const verifyEmail = async () => {
    if (!token || !emailParam) return;

    setIsVerifying(true);
    try {
      const res = await axiosInstance.post("/auth/verify-email", { 
        email: emailParam, 
        token 
      }, {
        withCredentials: true,
      });
      
      setUser(res.data.user);
      setIsVerified(true);
      toast.success("Email vérifié avec succès !");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de la vérification");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    const emailToUse = email || emailParam;
    
    if (!emailToUse) {
      toast.error("L'email est requis");
      return;
    }

    setIsResending(true);
    try {
      await axiosInstance.post("/auth/resend-verification", { email: emailToUse });
      toast.success("Email de vérification envoyé ! Veuillez vérifier votre boîte de réception.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'envoi de l'email de vérification");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow text-center">
        {isVerifying ? (
          <div>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Vérification de votre email...</p>
          </div>
        ) : isVerified ? (
          <div>
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-4 text-green-600">Email vérifié !</h2>
            <p className="text-gray-600 mb-4">Votre email a été vérifié avec succès.</p>
            <p className="text-sm text-gray-500">Redirection vers la page d'accueil...</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Vérifiez votre email</h2>
            <p className="text-gray-600 mb-4">
              {token && emailParam 
                ? "La vérification a échoué. Veuillez réessayer ou demander un nouvel email de vérification."
                : "Veuillez vérifier votre email pour le lien de vérification."}
            </p>
            
            {(!token || !emailParam) && (
              <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-2">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring focus:ring-blue-300"
                  placeholder="Entrez votre email"
                />
              </div>
            )}
            
            <button
              onClick={resendVerification}
              disabled={isResending}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 mb-4"
            >
              {isResending ? "Envoi..." : "Renvoyer l'email de vérification"}
            </button>
            
            <Link
              to="/login"
              className="block text-sm text-blue-600 hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

