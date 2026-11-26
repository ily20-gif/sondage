import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Menu, X, LogOut, Home, User2, PlusCircle, LayoutDashboard, Vote, Users, Bot, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "../lib/errorHandler";
import { SignOutButton, useClerk, useUser } from "@clerk/react";
import NotificationBell from "./NotificationBell";
import { brand } from "../config/brand";

export default function Header() {
  const { signOut } = useClerk();
  const { user, setUser } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useUser();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      await signOut();
      setUser(null);
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const navClass = (path) => `nav-link${location.pathname === path ? " nav-link-active" : ""}`;

  return (
    <header className="site-header">
      <nav className="site-nav">
        <div className="nav-inner">
          <Link to="/" className="brand-lockup" onClick={closeMobileMenu}>
            <span className="brand-symbol">{brand.logo ? <img src={brand.logo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <Vote size={20} />}</span>
            <span>{brand.name}<span className="brand-accent">{brand.accent}</span><small>{brand.slogan}</small></span>
          </Link>

          <div className="desktop-nav">
            <Link to="/" className={navClass("/")}><Home size={17} /> Accueil</Link>
            {user && <Link to="/polls/create" className="nav-create"><PlusCircle size={16} /> Créer un sondage</Link>}
            {!user ? (
              <>
                <Link to="/login" className={navClass("/login")}>Connexion</Link>
                <Link to="/register" className="nav-register">S'inscrire <span>→</span></Link>
              </>
            ) : (
              <>
                <NotificationBell />
                <Link to="/groups" className={navClass("/groups")}><Users size={17} /> Groupes</Link>
                <Link to="/assistant" className={navClass("/assistant")}><Bot size={17} /> Assistant IA</Link>
                {user.role === "admin" && <Link to="/admin" className={navClass("/admin")}><ShieldCheck size={17} /> Admin</Link>}
                <Link to="/polls/dashboard" className={navClass("/polls/dashboard")}><LayoutDashboard size={17} /> Tableau de bord</Link>
                <Link to="/profile" className={navClass("/profile")}><User2 size={17} /> Profil</Link>
                {isSignedIn ? (
                  <span className="nav-logout-clerk" onClick={handleLogout}><SignOutButton /></span>
                ) : (
                  <button onClick={handleLogout} className="nav-logout"><LogOut size={16} /> Déconnexion</button>
                )}
              </>
            )}
          </div>

          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Ouvrir le menu">
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={closeMobileMenu}>
          <div className="mobile-menu-panel" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-heading"><strong>Menu</strong><button onClick={closeMobileMenu} aria-label="Fermer le menu"><X size={21} /></button></div>
            <Link to="/" className={navClass("/")} onClick={closeMobileMenu}><Home size={17} /> Accueil</Link>
            {user && <Link to="/polls/create" className="nav-create" onClick={closeMobileMenu}><PlusCircle size={16} /> Créer un sondage</Link>}
            {!user ? (
              <>
                <Link to="/login" className={navClass("/login")} onClick={closeMobileMenu}>Connexion</Link>
                <Link to="/register" className="nav-register" onClick={closeMobileMenu}>S'inscrire <span>→</span></Link>
              </>
            ) : (
              <>
                <div className="mobile-notifications"><NotificationBell /></div>
                <Link to="/groups" className={navClass("/groups")} onClick={closeMobileMenu}><Users size={17} /> Groupes</Link>
                <Link to="/assistant" className={navClass("/assistant")} onClick={closeMobileMenu}><Bot size={17} /> Assistant IA</Link>
                {user.role === "admin" && <Link to="/admin" className={navClass("/admin")} onClick={closeMobileMenu}><ShieldCheck size={17} /> Admin</Link>}
                <Link to="/polls/dashboard" className={navClass("/polls/dashboard")} onClick={closeMobileMenu}><LayoutDashboard size={17} /> Tableau de bord</Link>
                <Link to="/profile" className={navClass("/profile")} onClick={closeMobileMenu}><User2 size={17} /> Profil</Link>
                <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="nav-logout"><LogOut size={16} /> Déconnexion</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
