import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  MessageSquare,
  PenLine,
  Radio,
  Share2,
  Video,
  BarChart3,
  Vote,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { fetchPolls } from "../services/poll.service";
import CardPoll from "./polls/CardPoll";
import { brand } from "../config/brand";
import "./home.css";

const STEPS = [
  {
    icon: PenLine,
    title: "Posez la question",
    text: "Écrivez votre question et vos propositions, ou laissez l'IA vous les suggérer à partir d'un simple thème. Vous relisez avant de publier.",
  },
  {
    icon: Share2,
    title: "Choisissez qui répond",
    text: "Ouvrez le sondage à tout le monde, ou réservez-le à un groupe : une filière, une classe, une équipe.",
  },
  {
    icon: BarChart3,
    title: "Suivez le résultat",
    text: "Les participants votent une seule fois. Le sondage se clôture à l'heure choisie et le résultat est publié.",
  },
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Groupes et sous-groupes",
    text: "Rejoignez votre filière, validation par un administrateur. Les sondages d'un groupe restent entre ses membres.",
  },
  {
    icon: Bot,
    title: "Assistant IA",
    text: "Discutez avec l'assistant pour trouver une idée, reformuler une question ou comprendre comment tout fonctionne.",
  },
  {
    icon: MessageSquare,
    title: "Discussion par sondage",
    text: "Chaque sondage a son fil de discussion en direct pour échanger avant de se décider.",
  },
  {
    icon: Video,
    title: "Salle de visio",
    text: "Besoin d'en parler à voix haute ? Ouvrez la salle vidéo liée au sondage en un clic.",
  },
  {
    icon: Bell,
    title: "Notifications",
    text: "Soyez prévenu quand un sondage se termine et que les résultats sont disponibles.",
  },
  {
    icon: LockKeyhole,
    title: "Un vote par personne",
    text: "Connexion obligatoire, un seul vote par sondage, et impossible de voter sur son propre sondage.",
  },
];

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [livePolls, setLivePolls] = useState([]);

  // Vrais sondages ouverts du moment (aucun chiffre inventé)
  useEffect(() => {
    let cancelled = false;
    fetchPolls()
      .then((all) => {
        if (cancelled || !Array.isArray(all)) return;
        const now = new Date();
        setLivePolls(all.filter((p) => p.status === "published" && new Date(p.end_time) > now).slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const goToPoll = (id) => navigate(`/vote/${id}`);

  return (
    <main className="hm-page">
      {/* ---------- Hero ---------- */}
      <section className="hm-hero">
        <div className="hm-hero-copy">
          <span className="hm-eyebrow">
            <Radio size={14} /> Sondages · Votes · Groupes
          </span>
          <h1>
            Posez la question.
            <br />
            <span>Le groupe répond.</span>
          </h1>
          <p>
            {brand.name}
            {brand.accent} vous aide à recueillir l'avis de votre classe, de votre filière ou de votre équipe, et à
            décider avec des résultats clairs.
          </p>
          <div className="hm-actions">
            <button type="button" className="hm-btn hm-btn-primary" onClick={() => navigate("/polls")}>
              <Vote size={18} /> Voir les sondages <ArrowRight size={16} />
            </button>
            {user ? (
              <button type="button" className="hm-btn hm-btn-ghost" onClick={() => navigate("/polls/create")}>
                Créer un sondage
              </button>
            ) : (
              <button type="button" className="hm-btn hm-btn-ghost" onClick={() => navigate("/register")}>
                Créer un compte
              </button>
            )}
          </div>
        </div>

        <div className="hm-hero-card" aria-hidden="true">
          <span className="hm-card-tag">Exemple</span>
          <h3>Quel créneau pour la sortie de fin d'année ?</h3>
          {[
            ["Vendredi après-midi", 52],
            ["Samedi matin", 31],
            ["Dimanche", 17],
          ].map(([label, pct]) => (
            <div className="hm-bar" key={label}>
              <div>
                <span>{label}</span>
                <strong>{pct}%</strong>
              </div>
              <i>
                <b style={{ width: `${pct}%` }} />
              </i>
            </div>
          ))}
          <p className="hm-card-foot">
            <CheckCircle2 size={14} /> Résultats mis à jour en direct
          </p>
        </div>
      </section>

      {/* ---------- Sondages ouverts ---------- */}
      {livePolls.length > 0 && (
        <section className="hm-section">
          <div className="hm-head hm-head-row">
            <div>
              <span className="hm-kicker">En ce moment</span>
              <h2>Des sondages ouverts, à vous de jouer</h2>
            </div>
            <Link to="/polls" className="hm-link">
              Tout voir <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hm-grid-3">
            {livePolls.map((poll) => (
              <CardPoll key={poll.id} poll={poll} user={user} onClick={goToPoll} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Comment ça marche ---------- */}
      <section className="hm-section">
        <div className="hm-head">
          <span className="hm-kicker">Comment ça marche</span>
          <h2>Trois étapes, du brouillon au résultat</h2>
        </div>
        <div className="hm-grid-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <article className="hm-step" key={title}>
              <span className="hm-step-num">{i + 1}</span>
              <span className="hm-icon">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Sondage ou vote ---------- */}
      <section className="hm-section">
        <div className="hm-head">
          <span className="hm-kicker">Deux formats</span>
          <h2>Un sondage pour tâter le terrain, un vote pour trancher</h2>
        </div>
        <div className="hm-grid-2">
          <article className="hm-format">
            <span className="hm-format-emoji">📊</span>
            <h3>Sondage</h3>
            <p>
              Les participants voient l'évolution des réponses en temps réel. Idéal pour prendre le pouls d'un groupe et
              en discuter pendant que ça avance.
            </p>
          </article>
          <article className="hm-format hm-format-alt">
            <span className="hm-format-emoji">🗳️</span>
            <h3>Vote</h3>
            <p>
              Les résultats restent cachés jusqu'à la clôture, puis la proposition gagnante est annoncée. Idéal pour une
              décision où personne ne doit être influencé.
            </p>
          </article>
        </div>
      </section>

      {/* ---------- Fonctionnalités ---------- */}
      <section className="hm-section">
        <div className="hm-head">
          <span className="hm-kicker">Ce que vous y trouvez</span>
          <h2>Tout pour décider ensemble, au même endroit</h2>
        </div>
        <div className="hm-grid-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article className="hm-feature" key={title}>
              <span className="hm-icon hm-icon-soft">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Appel à l'action ---------- */}
      <section className="hm-cta">
        <div>
          <h2>{user ? "Une question en tête ?" : "Prêt à donner votre avis ?"}</h2>
          <p>
            {user
              ? "Lancez un sondage en quelques minutes, ou demandez de l'aide à l'assistant."
              : "Créez un compte gratuit pour voter, créer vos sondages et rejoindre votre groupe."}
          </p>
        </div>
        <div className="hm-actions">
          {user ? (
            <>
              <button type="button" className="hm-btn hm-btn-light" onClick={() => navigate("/polls/create")}>
                Créer un sondage <ArrowRight size={16} />
              </button>
              <button type="button" className="hm-btn hm-btn-outline" onClick={() => navigate("/assistant")}>
                <Bot size={17} /> Parler à l'assistant
              </button>
            </>
          ) : (
            <>
              <button type="button" className="hm-btn hm-btn-light" onClick={() => navigate("/register")}>
                S'inscrire <ArrowRight size={16} />
              </button>
              <button type="button" className="hm-btn hm-btn-outline" onClick={() => navigate("/login")}>
                Se connecter
              </button>
            </>
          )}
        </div>
      </section>

      <footer className="hm-footer">
        <strong>
          {brand.name}
          <span>{brand.accent}</span>
        </strong>
        <p>Your opinion, your impact.</p>
      </footer>
    </main>
  );
}
