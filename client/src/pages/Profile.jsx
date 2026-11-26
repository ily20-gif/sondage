import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { Camera, Save, Loader2, Trash2, UserRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { updateProfile, updateProfileImage, deleteAccount } from "../services/user.service";

const Profile = () => {
  const { user, setUser, signout } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: "" });
  const [preview, setPreview] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({ fullName: user.fullName || "" });
      setPreview(user.image || "");
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const updated = await updateProfile(formData);
      setUser((currentUser) => ({ ...currentUser, ...updated }));
      toast.success("Profil mis à jour");
    } catch (e) {
      toast.error("Échec de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non autorisé. Choisissez JPG, PNG ou WEBP.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 5 Mo.");
      input.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setImageError("");

    try {
      setImageLoading(true);
      const res = await updateProfileImage(file);
      if (!res?.image) throw new Error("Le serveur n'a pas retourné l'URL de l'image.");

      setUser((currentUser) => ({ ...currentUser, image: res.image }));
      setPreview(res.image);
      URL.revokeObjectURL(localPreview);
      toast.success("Photo de profil mise à jour");
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      setPreview(user?.image || "");
      toast.error(error.response?.data?.message || "Échec du téléchargement de l'image");
    } finally {
      setImageLoading(false);
      input.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Cette action est permanente. Continuer ?")) return;
    try {
      await deleteAccount();
      await signout();
      window.location.replace("/login");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Échec de la suppression du compte");
    }
  };

  const initials = (user?.fullName || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-8 text-white shadow-xl sm:px-9">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100"><Sparkles size={14} /> Espace personnel</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mon profil</h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">Consultez et gérez vos informations personnelles et les paramètres de votre compte.</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound size={20} /></div>
              <div><h2 className="font-semibold text-slate-900">Informations du compte</h2><p className="text-sm text-slate-500">Modifiez les informations associées à votre compte.</p></div>
            </div>
          </div>

          <div className="flex flex-col gap-5 border-b border-slate-100 bg-slate-50/70 px-6 py-7 sm:flex-row sm:items-center sm:px-8">
            <div className="relative h-24 w-24 shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-3xl font-bold text-indigo-700 ring-4 ring-white shadow-md">
                {imageLoading ? <Loader2 className="animate-spin" size={28} /> : preview ? <img src={preview} alt="Photo de profil" className="h-full w-full object-cover" onError={() => { setImageError("Impossible de charger la photo."); setPreview(""); }} /> : initials}
              </div>
              <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700" title="Modifier la photo">
                <Camera size={16} />
                <input type="file" hidden accept="image/*" onChange={handleImageChange} disabled={imageLoading} />
              </label>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">{user?.fullName || "Utilisateur"}</h3>
              <p className="mt-1 break-all text-sm text-slate-500">{user?.email}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><ShieldCheck size={13} /> Compte personnel</div>
              <p className="mt-2 text-xs text-slate-400">Cliquez sur l'icône pour changer votre photo (JPG, PNG ou WEBP, 5 Mo maximum).</p>
              {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
            </div>
          </div>

          <div className="space-y-5 px-6 py-7 sm:px-8">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nom complet</label>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={formData.fullName} onChange={(e) => setFormData({ fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={user?.email || ""} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-500" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">L'adresse e-mail ne peut pas être modifiée ici.</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button onClick={handleSave} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="flex items-center gap-2"><Trash2 size={18} className="text-red-600" /><h2 className="font-semibold text-slate-900">Zone de danger</h2></div><p className="mt-1 text-sm text-slate-500">La suppression de votre compte est définitive et ne peut pas être annulée.</p></div>
            <button onClick={handleDelete} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"><Trash2 size={16} /> Supprimer mon compte</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
