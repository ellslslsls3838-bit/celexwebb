"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { startSpotifyLogin, getSpotifyToken, searchSpotifyTracks, fetchSpotifySavedTracks, spotifyLogout, isSpotifyConfigured, hasSpotifySession } from "@/lib/spotify";
import { getLyricsWithFallback } from "@/lib/lyrics";

type ProjectMovie = {
  title: string;
  img: string;
  description: string;
  videoSrc: string;
  modalTitle?: string;
  modalBody?: string;
  downloadUrl?: string;
};

type VideoModalState = {
  src: string;
  heading: string;
  body: string;
  downloadUrl?: string;
};

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type LyricLine = {
  time: number;
  text: string;
};

type LyricEditorState = {
  isEditing: boolean;
  trackIndex: number;
  lyricsBeingEdited: LyricLine[];
  currentInput: string;
};

type SidebarTrack = {
  title: string;
  artist: string;
  subtitle?: string;
  art: string;
  src: string;
  album?: string;
  lyrics?: LyricLine[];
  lyricsImage?: string;
  liked?: boolean;
  source?: "local" | "spotify";
  spotifyId?: string;
  spotifyUri?: string;
  durationSec?: number;
};

type WeatherData = {
  temp: number;
  description: string;
  city: string;
  icon: string;
};

type CollaboratorStatus = "online" | "idle" | "dnd" | "offline";

type CollaboratorProfile = {
  name: string;
  role: string;
  img: string;
  displayName?: string;
  username?: string;
  banner?: string;
  bio?: string;
  customStatus?: string;
  link?: string;
  status?: CollaboratorStatus;
};

const STATUS_COLORS: Record<CollaboratorStatus, string> = {
  online: "#23a559",
  idle: "#f0b232",
  dnd: "#f23f43",
  offline: "#80848e",
};

// Fondo predeterminado de cada pestaña. Puedes cambiar estas URLs de Imgur
// cuando quieras — son el punto de partida antes de que el usuario elija
// otro fondo desde Configuración.
const DEFAULT_TAB_BACKGROUNDS: Record<string, string> = {
  home:     "https://i.imgur.com/Ompb0lt.png",
  projects: "https://i.imgur.com/Ompb0lt.png",
  apps:     "https://i.imgur.com/Ompb0lt.png",
  ia:       "https://i.imgur.com/Ompb0lt.png",
  music:    "https://i.imgur.com/Ompb0lt.png",
};

// Pestañas cuyo fondo se puede personalizar desde Configuración.
const BACKGROUND_TABS = ["home", "projects", "apps", "ia", "music"] as const;

// Catálogo de fondos disponibles para elegir en Configuración.
// Agrega aquí tus propios links de Imgur (name = lo que se ve en el selector,
// url = el link directo de la imagen). Puedes repetir o quitar los que quieras.
type BackgroundOption = { name: string; url: string };
const AVAILABLE_BACKGROUNDS: BackgroundOption[] = [
  { name: "Original", url: "https://i.imgur.com/Ompb0lt.png" },
  { name: "Fondo 2", url: "https://i.imgur.com/edLtiYT.jpeg" },
  { name: "Fondo 3", url: "https://i.imgur.com/jub6cmq.jpeg" },
  { name: "girl", url: "https://i.imgur.com/tZpX30Q.png" },
  ]; 

const SETTINGS_STORAGE_KEY = "site-settings-v1";

const CLD_DEMO = "https://res.cloudinary.com/dqm17v2b6/video/upload/v1773902976/lv_0_20260319000205_rtckep.mp4";

const movies: ProjectMovie[] = [
  {
    title: "richpresence",
    img: "https://i.imgur.com/TkPfwrh.png",
    description: "modifica la rich presence de tu perfil de discord con esta aplicacion, puedes elegir entre varias plantillas o crear la tuya propia",
    videoSrc: CLD_DEMO,
    modalTitle: "Rich presence para Discord",
    modalBody: "Personaliza el estado de tu perfil con plantillas o diseños propios.",
    downloadUrl: "https://res.cloudinary.com/dqm17v2b6/video/upload/v1773902976/lv_0_20260319000205_rtckep.mp4",
  },
  {
    title: "rat file",
    img: "https://i.imgur.com/FppGRaZ.png",
    description: "encripta los archivos de la pc de la victima(solo si sospechas que tiene contenido privado de ti o ilegal)",
    videoSrc: CLD_DEMO,
    modalBody: "Descripción detallada del proyecto. Aquí puedes explicar pasos, requisitos o enlaces.",
  },
  {
    title: "spyware",
    img: "https://i.imgur.com/aG4zFeJ.png",
    description: "accese a la camara de la victima",
    videoSrc: CLD_DEMO,
    modalTitle: "Vista previa del proyecto",
    modalBody: "Aquí va tu descripción larga (instrucciones, requisitos, avisos).",
    downloadUrl: "https://example.com/download",
  },
  {
    title: "cfg",
    img: "https://i.imgur.com/m33BWHP.png",
    description: "horizon cfg",
    videoSrc: CLD_DEMO,
  },
  {
    title: "resert hwid",
    img: "https://i.imgur.com/G1001Au.png",
    description: "cambio de hwid para baneos de diferentes juegos",
    videoSrc: CLD_DEMO,
  },
];

const collaborators: CollaboratorProfile[] = [
  {
    name: "melody",
    displayName: "Melody",
    username: "melody",
    role: "Owner (my dog)",
    img: "https://i.imgur.com/r8qP6df.jpeg",
    banner: "https://i.imgur.com/Ompb0lt.png",
    bio: "owner de toda la web jeje",
    status: "online",
  },
  {
    name: "anglx",
    displayName: "Celex",
    username: "xxq7131",
    role: "Developer",
    img: "https://i.imgur.com/XmbGsBE.jpeg",
    banner: "https://i.imgur.com/5aq3F0c.jpeg",
    bio: "¿por que no soy suficiente? ",
    link: "https://guns.lol/celexsex",
    status: "dnd",
  },
  {
    name: "soydemara",
    displayName: "soydemara",
    username: "soydemara",
    role: "Tester",
    img: "https://i.imgur.com/z3JgDon.jpeg",
    banner: "https://i.imgur.com/Ompb0lt.png",
    bio: "Tester del equipo. Encargada de encontrar bugs antes que nadie.",
    status: "idle",
  },
  {
    name: "stupid",
    displayName: "stupid",
    username: "stupid",
    role: "leaving",
    img: "https://i.imgur.com/bFOtnQT.jpeg",
    banner: "https://i.imgur.com/Ompb0lt.png",
    bio: "Diseño visual y estética del proyecto.",
    status: "offline",
  },
  {
    name: "shiori",
    displayName: "shiori",
    username: "shiori",
    role: "leaving",
    img: "https://i.imgur.com/3JHIbx3.png",
    banner: "https://i.imgur.com/Ompb0lt.png",
    bio: "Arte, ilustraciones y assets visuales para la web.",
    status: "offline",
  },
  {
    name: "zee",
    displayName: "zee",
    username: "zee",
    role: "html",
    img: "https://i.imgur.com/s5rnRg9.png",
    banner: "https://i.imgur.com/Ompb0lt.png",
    bio: "HTML, estructura y maquetado del sitio.",
    status: "online",
  },
];

const initialSidebarPlaylist: SidebarTrack[] = [
  { title: "cruel world", artist: "Lana del rey", art: "https://i.imgur.com/LX4Mhh0.jpeg", src: "/music/cruel world.mp3", album: "ultraviolence", lyricsImage: "https://i.imgur.com/LX4Mhh0.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "She said, Careful, or you'll lose it" }, { time: 3, text: "But, girl, I'm only human" }, { time: 6, text: "And I know there's a blade where your heart is" }, { time: 9, text: "And you know how to use it" }, { time: 12, text: "And you can take my flesh if you want girl" }, { time: 15, text: "But, baby, don't abuse it" }, { time: 18, text: "" }, { time: 20, text: "These voices in my head screaming, Run now" }, { time: 23, text: "(Don't run)" }] },
  { title: "muñequita", artist: "logan lowe", art: "https://i.imgur.com/CM5F9mJ.png", src: "/music/muñequita.mp3", album: "muñequita", lyricsImage: "https://i.imgur.com/CM5F9mJ.png", liked: false, source: "local", lyrics: [{ time: 0, text: "Ella es mi muñequita" }, { time: 3, text: "Con los ojos de diamante" }, { time: 6, text: "Bailamos en la noche" }, { time: 9, text: "Como nunca fue importante" }, { time: 12, text: "Tú eres mi tesoro" }, { time: 15, text: "En este mundo cruel" }, { time: 18, text: "" }, { time: 20, text: "Mi muñequita linda" }, { time: 23, text: "Te amo sin final" }] },
  { title: "1004km", artist: "junior h", art: "https://i.imgur.com/rDaxBzL.jpeg", src: "/music/1004 KM.mp3", album: "1004 KM", lyricsImage: "https://i.imgur.com/rDaxBzL.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Mil kilómetros de distancia" }, { time: 3, text: "Pero tú siempre en mi mente" }, { time: 6, text: "Volando cada noche" }, { time: 9, text: "Para estar nuevamente" }, { time: 12, text: "Este viaje es infinito" }, { time: 15, text: "Pero vale la pena" }, { time: 18, text: "" }, { time: 20, text: "1004 kilómetros nos separan" }, { time: 23, text: "Pero el amor nos acerca" }] },
  { title: "Cigarettes out the window", artist: "tvgirl", art: "https://i.imgur.com/0ytAweD.jpeg", src: "/music/Tv girl.mp3", album: "Who Really Cares", lyricsImage: "https://i.imgur.com/0ytAweD.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Fumando en la ventana" }, { time: 3, text: "Mirando hacia la ciudad" }, { time: 6, text: "Tú estás lejos de aquí" }, { time: 9, text: "Y yo aquí pensando en ti" }, { time: 12, text: "Los cigarrillos caen lentamente" }, { time: 15, text: "Como mi corazón también" }, { time: 18, text: "" }, { time: 20, text: "Humo blanco en el aire" }, { time: 23, text: "Recordándote a ti" }] },
  { title: "Y LLORO", artist: "junior h", art: "https://i.imgur.com/bRnctyy.png", src: "/music/Y LLORO.mp3", album: "Y LLORO", lyricsImage: "https://i.imgur.com/bRnctyy.png", liked: false, source: "local", lyrics: [{ time: 0, text: "Y lloro, lloro, lloro" }, { time: 3, text: "Sin poder detenerme" }, { time: 6, text: "Lágrimas que caen solas" }, { time: 9, text: "De tanto querer verte" }, { time: 12, text: "Gritaría tu nombre" }, { time: 15, text: "En cada rincón del mundo" }, { time: 18, text: "" }, { time: 20, text: "Lloro porque te amo" }, { time: 23, text: "Con todo mi profundo" }] },
  { title: "Siesta Freestyle", artist: "Lewis OfMan · Alicia te quiero", art: "https://i.imgur.com/hMQfhTW.jpeg", src: "/music/Siesta Freestyle.mp3", album: "dancy party", lyricsImage: "https://i.imgur.com/hMQfhTW.jpeg", liked: false, source: "local", lyrics: [{ time: 1, text: "la sal envolvia mi cuerpo" }, { time: 5, text: "♪" }, { time: 34, text: "me has dado muchos besos y me sabe todo a sal" }, { time: 37, text: "estar tirada en tu cuarto se parece mucho al mar" }, { time: 43, text: "tengo arena hasta los ojos no me la puedo quitar" }, { time: 47, text: "¿quieres venir al sol conmigo?" }, { time: 50, text: "que me tengo que secar" }, { time: 53, text: "no voy a vestirme nunca" }, { time: 55, text: "las conchas me pueden tapar" }, { time: 58, text: "quiero vivir en la playa" }, { time: 60, text: "me conformo con flotar" }, { time: 63, text: "solo nado si es contigo" }, { time: 65, text: "tomo sol en la ciudad" }, { time: 67, text: "no le entienden los vecinos" }, { time: 70, text: "te espero en la orilla" }, { time: 72, text: "♪" }, { time: 91.5, text: "me has dado muchos besos y me sabe todo a sal" }, { time: 96, text: "oigo el rudo de las olas, me parecen de verdad" }] },
  { title: "Igual Que Un Ángel", artist: "Kali Uchis, Peso Pluma", art: "https://i.imgur.com/ZeBCpy5.jpeg", src: "/music/Igual Que Un Ángel.mp3", album: "ORQUIDEAS", lyricsImage: "https://i.imgur.com/ZeBCpy5.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Eres igual que un ángel" }, { time: 3, text: "Cayendo del cielo azul" }, { time: 6, text: "Con alas de oro y blanco" }, { time: 9, text: "Iluminando mi salud" }, { time: 12, text: "Tus ojos brillan como estrellas" }, { time: 15, text: "Tan hermosos y tan puros" }, { time: 18, text: "" }, { time: 20, text: "Eres mi ángel guardián" }, { time: 23, text: "Mi amor para siempre" }] },
  { title: "No One Noticed (Extended Spanish)", artist: "the marias", art: "https://i.imgur.com/rGywpJQ.png", src: "/music/No One Noticed (Extended Spanish).mp3", album: "No One Noticed", lyricsImage: "https://i.imgur.com/rGywpJQ.png", liked: false, source: "local", lyrics: [{ time: 0, text: "Nadie se percató" }, { time: 3, text: "De lo que sentía por ti" }, { time: 6, text: "Un amor escondido" }, { time: 9, text: "Que guardé en lo profundo de mí" }, { time: 12, text: "Pasaste por mi lado" }, { time: 15, text: "Sin verme a los ojos" }, { time: 18, text: "" }, { time: 20, text: "Pero nadie notó" }, { time: 23, text: "Que me rompía por dentro" }] },
  { title: "SLOW DANCING IN THE DARK", artist: "JOJI", art: "https://i.imgur.com/sE6p4xD.jpeg", src: "/music/SLOW DANCING IN THE DARK.mp3", album: "BALLADS1", lyricsImage: "https://i.imgur.com/sE6p4xD.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Bailando lentamente en la oscuridad" }, { time: 3, text: "Tus manos en las mías" }, { time: 6, text: "Susurrándome verdad" }, { time: 9, text: "El mundo desaparece cuando estás aquí" }, { time: 12, text: "Solo yo, solo tú" }, { time: 15, text: "Bajo este cielo gris" }, { time: 18, text: "" }, { time: 20, text: "Bailando en la oscuridad" }, { time: 23, text: "Encontré mi luz en ti" }] },
  { title: "my kind of woman", artist: "Mac DeMarco", art: "https://i.imgur.com/ZHIGP1P.jpeg", src: "/music/my kind of woman.mp3", album: "2", lyricsImage: "https://i.imgur.com/ZHIGP1P.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Tú eres mi tipo de mujer" }, { time: 3, text: "La que siempre he buscado" }, { time: 6, text: "Con ese toque especial" }, { time: 9, text: "Que me ha fascinado" }, { time: 12, text: "Tu risa es mi canción favorita" }, { time: 15, text: "Tu amor mi religión" }, { time: 18, text: "" }, { time: 20, text: "Eres mi tipo de mujer" }, { time: 23, text: "Mi razón de existir" }] },
  { title: "chanel", artist: "junior h", art: "https://i.imgur.com/JavER2r.jpeg", src: "/music/Chanel.mp3", album: "SAD BOYZ 4 LIFE", lyricsImage: "https://i.imgur.com/JavER2r.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Chanel, Chanel, así te vistes" }, { time: 3, text: "De lujo y elegancia" }, { time: 6, text: "Tus labios rojos como la pasión" }, { time: 9, text: "Que mata mi esperanza" }, { time: 12, text: "Caminan detrás tuyo todos" }, { time: 15, text: "Queriendo tu atención" }, { time: 18, text: "" }, { time: 20, text: "Pero solo me ves a mí" }, { time: 23, text: "En esta confusión" }] },
  { title: "See You Again", artist: "Tyler The Creator & Kali Uchis", art: "https://i.imgur.com/ZEAkWpx.jpeg", src: "/music/See You Again.mp3", album: "flower boy", lyricsImage: "https://i.imgur.com/ZEAkWpx.jpeg", liked: false, source: "local", lyrics: [{ time: 0, text: "Te veo de nuevo en mis sueños" }, { time: 3, text: "Donde el tiempo se detiene" }, { time: 6, text: "Tu sonrisa me acompaña" }, { time: 9, text: "Dondequiera que vengas" }, { time: 12, text: "Espero el día que regreses" }, { time: 15, text: "A mi lado para siempre" }, { time: 18, text: "" }, { time: 20, text: "Te veré de nuevo, lo sé" }, { time: 23, text: "En esta vida o en otra" }] },
];

const contactHeroImage = "https://i.imgur.com/sKDDDSp.png";
const contactHeroImageRight = "https://i.imgur.com/rIKdXic.png";
const contactBubbleText = "hola aqui puedes contactarnos, gracias por su apoyo!!";
const contactLinks = {
  telegram: "https://telegram.me/celextxt",
  whatsapp: "https://wa.me/+527441353267",
  discord: "https://discord.gg/tu-invite",
};

// ── Meses en español ──
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function formatMusicTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type ProfileAnchor = {
  top: number;
  left: number;
  height: number;
};

const PROFILE_CARD_WIDTH = 340;

// ── Perfil estilo Discord (popout al lado del colaborador) ──
function DiscordProfilePopout({
  user,
  anchor,
  onClose,
}: {
  user: CollaboratorProfile;
  anchor: ProfileAnchor;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [pos, setPos] = useState({ top: anchor.top, left: anchor.left - PROFILE_CARD_WIDTH - 12 });
  const displayName = user.displayName ?? user.name;
  const username = user.username ?? user.name.toLowerCase().replace(/\s+/g, "");
  const bio = user.bio ?? "...";
  const status = user.status ?? "offline";
  const bioPreviewLimit = 140;
  const needsBioExpand = bio.length > bioPreviewLimit;

  const updatePosition = useCallback(() => {
    const cardH = cardRef.current?.offsetHeight ?? 420;
    const gap = 12;
    const pad = 12;

    let left = anchor.left - PROFILE_CARD_WIDTH - gap;
    if (left < pad) left = pad;

    let top = anchor.top + anchor.height / 2 - 72;
    top = Math.max(pad, Math.min(top, window.innerHeight - cardH - pad));
    setPos({ top, left });
  }, [anchor]);

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[170]" onClick={onClose} aria-hidden />
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, x: 10, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 10, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ top: pos.top, left: pos.left, width: PROFILE_CARD_WIDTH }}
        className="fixed z-[171] overflow-hidden rounded-xl bg-[#111214] shadow-[0_12px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[120px] w-full overflow-hidden">
          {user.banner ? (
            <img src={user.banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-900/80 via-[#1e1f22] to-blue-900/60" />
          )}
          {user.customStatus && (
            <div className="absolute bottom-3 right-4 max-w-[calc(100%-6rem)] rounded-xl border border-white/10 bg-[#111214]/95 px-3 py-2 text-[13px] text-zinc-200 shadow-lg backdrop-blur-sm">
              <span className="line-clamp-2">&ldquo;{user.customStatus}&rdquo;</span>
              <span className="pointer-events-none absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-[#111214]/95" aria-hidden />
            </div>
          )}
        </div>

        <div className="relative px-4 pb-5">
          <div className="absolute -top-10 left-4">
            <div className="relative">
              <img
                src={user.img}
                alt={displayName}
                className="h-[80px] w-[80px] rounded-full border-[6px] border-[#111214] object-cover bg-[#111214]"
              />
              <span
                className="absolute bottom-0.5 right-0.5 h-[22px] w-[22px] rounded-full border-[4px] border-[#111214]"
                style={{ backgroundColor: STATUS_COLORS[status] }}
                title={status}
              />
            </div>
          </div>

          <div className="pt-12">
            <h3 className="text-xl font-bold leading-tight text-white">{displayName}</h3>
            <p className="mt-0.5 text-sm text-zinc-400">{username}</p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-200">{user.role}</span>
            </div>

            {user.link && (
              <a
                href={user.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block truncate text-sm text-[#00a8fc] hover:underline"
              >
                {user.link.replace(/^https?:\/\//, "")}
              </a>
            )}

            <div className="my-4 h-px bg-white/10" />

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Acerca de mí</p>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200">
                {bioExpanded || !needsBioExpand ? bio : `${bio.slice(0, bioPreviewLimit).trim()}…`}
              </p>
              {needsBioExpand && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-2 text-sm font-medium text-zinc-300 hover:text-white transition"
                >
                  {bioExpanded ? "Ver menos" : "Ver biografía completa"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Componente Reloj 3D ──
function Clock3D() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=apparent_temperature`
        );
        const data = await res.json();
        const code = data.current_weather?.weathercode ?? 0;
        const temp = Math.round(data.current_weather?.temperature ?? 0);

        // Reverse geocode city name
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const geoData = await geoRes.json();
        const city =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.municipality ||
          geoData.address?.county ||
          "Tu ubicación";

        const icon = code <= 1 ? "☀️" : code <= 3 ? "⛅" : code <= 67 ? "🌧️" : code <= 77 ? "❄️" : "⛈️";
        const description = code <= 1 ? "Despejado" : code <= 3 ? "Parcialmente nublado" : code <= 67 ? "Lluvia" : code <= 77 ? "Nieve" : "Tormenta";

        setWeather({ temp, description, city, icon });
      } catch {
        // silently fail
      }
    });
  }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const hDeg = (h % 12) * 30 + m * 0.5;
  const mDeg = m * 6 + s * 0.1;
  const sDeg = s * 6;

  const dateStr = `${DAYS_ES[time.getDay()]}, ${time.getDate()} ${MONTHS_ES[time.getMonth()]}`;

  return (
    <div className="mt-4 flex flex-col items-center gap-3 border-t border-white/10 pt-4">
      {/* Reloj analógico 3D */}
      <div
        className="relative w-24 h-24 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{ transform: "rotateX(15deg)", transformStyle: "preserve-3d" }}
      >
        {/* Ticks */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-2 bg-white/30 rounded-full"
            style={{
              top: "4px",
              left: "50%",
              transformOrigin: "bottom center",
              transform: `translateX(-50%) rotate(${i * 30}deg) translateY(0)`,
              marginTop: "0",
            }}
          />
        ))}
        {/* Centro */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white z-10" />
        </div>
        {/* Hora */}
        <div
          className="absolute bottom-1/2 left-1/2 w-0.5 h-7 bg-white rounded-full origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${hDeg}deg)` }}
        />
        {/* Minuto */}
        <div
          className="absolute bottom-1/2 left-1/2 w-0.5 h-9 bg-white/80 rounded-full origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${mDeg}deg)` }}
        />
        {/* Segundo */}
        <div
          className="absolute bottom-1/2 left-1/2 w-px h-10 bg-red-400 rounded-full origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${sDeg}deg)` }}
        />
      </div>

      {/* Hora digital */}
      <div className="text-center">
        <p className="text-white font-bold text-lg tabular-nums">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
        <p className="text-zinc-400 text-xs">{dateStr}</p>
      </div>

      {/* Clima */}
      {weather ? (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-zinc-400 truncate">{weather.city}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xl">{weather.icon}</span>
            <div>
              <p className="text-white font-bold text-sm">{weather.temp}°C</p>
              <p className="text-zinc-400 text-[10px]">{weather.description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
          <p className="text-zinc-500 text-xs">Cargando clima...</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();
  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const [selected, setSelected] = useState(movies[0]);
  const [index, setIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [tabBackgrounds, setTabBackgrounds] = useState<Record<string, string>>(DEFAULT_TAB_BACKGROUNDS);
  const [cardsTransparent, setCardsTransparent] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Cargar configuración guardada (fondos elegidos + transparencia de tarjetas)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.tabBackgrounds) setTabBackgrounds({ ...DEFAULT_TAB_BACKGROUNDS, ...saved.tabBackgrounds });
        if (typeof saved.cardsTransparent === "boolean") setCardsTransparent(saved.cardsTransparent);
      }
    } catch {
      // si falla la lectura, se quedan los valores predeterminados
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  // Guardar configuración cada vez que cambie
  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ tabBackgrounds, cardsTransparent }));
    } catch {
      // almacenamiento no disponible, se ignora
    }
  }, [tabBackgrounds, cardsTransparent, settingsLoaded]);

  const setTabBackground = (tab: string, url: string) => {
    setTabBackgrounds((prev) => ({ ...prev, [tab]: url }));
  };

  const resetTabBackground = (tab: string) => {
    setTabBackgrounds((prev) => ({ ...prev, [tab]: DEFAULT_TAB_BACKGROUNDS[tab] }));
  };

  // Clases de las tarjetas de Calendario (sidebar izquierdo) y Colaboradores
  // (sidebar derecho). Predeterminado = estilo original (no transparente).
  const cardSurfaceClass = cardsTransparent
    ? "bg-transparent border-transparent shadow-none"
    : "bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  const [musicTrackIndex, setMusicTrackIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicCurrentTime, setMusicCurrentTime] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [sidebarVolume, setSidebarVolume] = useState(0.75);
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);
  const [sidebarPlaylist, setSidebarPlaylist] = useState<SidebarTrack[]>(initialSidebarPlaylist);

  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isLoadingSpotifyLibrary, setIsLoadingSpotifyLibrary] = useState(false);
  const [playlistSource, setPlaylistSource] = useState<"local" | "spotify">("local");
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifySearchResults, setSpotifySearchResults] = useState<any[]>([]);
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);

  const [currentLyrics, setCurrentLyrics] = useState("");
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressBarLyricsRef = useRef<HTMLDivElement>(null);
  const bottomProgressBarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const [lyricEditor, setLyricEditor] = useState<LyricEditorState>({
    isEditing: false,
    trackIndex: -1,
    lyricsBeingEdited: [],
    currentInput: "",
  });

  const [videoModal, setVideoModal] = useState<VideoModalState | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorProfile | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<ProfileAnchor | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadPlaylist = useCallback(async () => {
    if (!hasSpotifySession()) {
      setIsSpotifyConnected(false);
      setPlaylistSource("local");
      setSidebarPlaylist(initialSidebarPlaylist);
      return;
    }

    setIsSpotifyConnected(true);
    setIsLoadingSpotifyLibrary(true);
    try {
      const token = await getSpotifyToken();
      if (!token) {
        setIsSpotifyConnected(false);
        setPlaylistSource("local");
        setSidebarPlaylist(initialSidebarPlaylist);
        return;
      }

      const tracks = await fetchSpotifySavedTracks();
      if (tracks.length > 0) {
        setSidebarPlaylist(tracks);
        setPlaylistSource("spotify");
        setMusicTrackIndex(0);
        setMusicPlaying(false);
      } else {
        setSidebarPlaylist(initialSidebarPlaylist);
        setPlaylistSource("local");
      }
    } catch (err) {
      console.error("Error cargando likes de Spotify:", err);
      setIsSpotifyConnected(false);
      setSidebarPlaylist(initialSidebarPlaylist);
      setPlaylistSource("local");
    } finally {
      setIsLoadingSpotifyLibrary(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaylist();
    const onFocus = () => { void loadPlaylist(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadPlaylist]);

  const handleSpotifyDisconnect = useCallback(() => {
    spotifyLogout();
    setIsSpotifyConnected(false);
    setPlaylistSource("local");
    setSidebarPlaylist(initialSidebarPlaylist);
    setMusicTrackIndex(0);
    setMusicPlaying(false);
    setSpotifySearchResults([]);
  }, []);

  const closeCollaboratorProfile = useCallback(() => {
    setSelectedCollaborator(null);
    setProfileAnchor(null);
  }, []);

  const openCollaboratorProfile = useCallback((user: CollaboratorProfile, el: HTMLElement) => {
    if (selectedCollaborator?.name === user.name) {
      closeCollaboratorProfile();
      return;
    }
    const rect = el.getBoundingClientRect();
    setProfileAnchor({ top: rect.top, left: rect.left, height: rect.height });
    setSelectedCollaborator(user);
  }, [selectedCollaborator, closeCollaboratorProfile]);

  const sendToGemini = async (userText: string) => {
    if (!userText.trim()) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", text: userText }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          })),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${response.status}`);
      }
      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "muy pronto se agregara esta funcion";
      setChatMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setChatMessages((prev) => [...prev, { role: "ai", text: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const openProjectVideo = useCallback((movie: ProjectMovie) => {
    setVideoModal({ src: movie.videoSrc, heading: movie.modalTitle ?? movie.title, body: movie.modalBody ?? movie.description, downloadUrl: movie.downloadUrl });
  }, []);

  const closeProjectVideo = useCallback(() => {
    const v = previewVideoRef.current;
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    setVideoModal(null);
  }, []);

  useEffect(() => {
    if (!videoModal) return;
    const id = requestAnimationFrame(() => { void previewVideoRef.current?.play().catch(() => {}); });
    return () => cancelAnimationFrame(id);
  }, [videoModal]);

  useEffect(() => {
    if (!videoModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeProjectVideo(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoModal, closeProjectVideo]);

  const currentSidebarTrack = sidebarPlaylist[musicTrackIndex] ?? sidebarPlaylist[0];

  useEffect(() => { const a = audioRef.current; if (a) a.volume = sidebarVolume; }, [sidebarVolume]);
  useEffect(() => { setMusicCurrentTime(0); setCurrentLyricIndex(0); }, [musicTrackIndex]);

  useEffect(() => {
    const track = sidebarPlaylist[musicTrackIndex];
    if (track?.durationSec) {
      setMusicDuration(track.durationSec);
    } else {
      setMusicDuration(0);
    }
  }, [musicTrackIndex, sidebarPlaylist]);

  useEffect(() => {
    if (!currentSidebarTrack.lyrics) return;
    for (let i = currentSidebarTrack.lyrics.length - 1; i >= 0; i--) {
      if (musicCurrentTime >= currentSidebarTrack.lyrics[i].time) { setCurrentLyricIndex(i); break; }
    }
  }, [musicCurrentTime, currentSidebarTrack.lyrics]);

  useEffect(() => {
    if (!lyricsContainerRef.current) return;
    const elements = lyricsContainerRef.current.querySelectorAll('[data-lyric]');
    if (elements[currentLyricIndex]) elements[currentLyricIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLyricIndex]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (musicPlaying) { void a.play().catch(() => setMusicPlaying(false)); }
    else { a.pause(); }
  }, [musicPlaying, musicTrackIndex]);

  const pickNextIndex = useCallback((from: number) => {
    const n = sidebarPlaylist.length;
    if (n <= 1) return 0;
    if (shuffleOn) { let j = from; let guard = 0; while (j === from && guard++ < 32) { j = Math.floor(Math.random() * n); } return j; }
    return (from + 1) % n;
  }, [shuffleOn, sidebarPlaylist.length]);

  const goPrevTrack = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; setMusicCurrentTime(0); return; }
    setMusicTrackIndex((i) => (i - 1 + sidebarPlaylist.length) % sidebarPlaylist.length);
  }, [sidebarPlaylist.length]);

  const goNextTrack = useCallback(() => { setMusicTrackIndex((i) => pickNextIndex(i)); }, [pickNextIndex]);

  const handleAudioEnded = useCallback(() => {
    if (repeatOn) { const a = audioRef.current; if (a) { a.currentTime = 0; setMusicCurrentTime(0); void a.play().catch(() => setMusicPlaying(false)); } return; }
    if (sidebarPlaylist.length <= 1) { setMusicPlaying(false); return; }
    setMusicTrackIndex((i) => pickNextIndex(i));
  }, [pickNextIndex, repeatOn, sidebarPlaylist.length]);

  const seekMusicLyrics = useCallback((clientX: number) => {
    const bar = progressBarLyricsRef.current; const a = audioRef.current;
    if (!bar || !a || !Number.isFinite(musicDuration) || musicDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pct * musicDuration;
    a.currentTime = newTime; setMusicCurrentTime(newTime);
  }, [musicDuration]);

  const seekMusic = useCallback((clientX: number) => {
    const bar = progressBarRef.current; const a = audioRef.current;
    if (!bar || !a || !Number.isFinite(musicDuration) || musicDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * musicDuration; setMusicCurrentTime(a.currentTime);
  }, [musicDuration]);

  const seekMusicBottom = useCallback((clientX: number) => {
    const bar = bottomProgressBarRef.current; const a = audioRef.current;
    if (!bar || !a || !Number.isFinite(musicDuration) || musicDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * musicDuration; setMusicCurrentTime(a.currentTime);
  }, [musicDuration]);

  useEffect(() => {
    const interval = setInterval(() => { setIndex((prev) => (prev + 1) % movies.length); }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setSelected(movies[index]); }, [index]);

  const progressPct = musicDuration > 0 ? (musicCurrentTime / musicDuration) * 100 : 0;

  const playTrack = (i: number) => {
    const track = sidebarPlaylist[i];
    if (track?.source === "spotify" && !track.src) {
      if (track.spotifyUri) {
        window.open(`https://open.spotify.com/track/${track.spotifyId ?? track.spotifyUri.split(":").pop()}`, "_blank");
      }
      return;
    }
    if (musicTrackIndex === i) { setMusicPlaying((v) => !v); }
    else { setMusicTrackIndex(i); setMusicPlaying(true); }
  };

  const startLyricEditing = (trackIndex: number) => {
    setLyricEditor({ isEditing: true, trackIndex, lyricsBeingEdited: [...(sidebarPlaylist[trackIndex].lyrics || [])], currentInput: "" });
    setMusicPlaying(true);
  };

  const addLyricAtCurrentTime = () => {
    if (!lyricEditor.currentInput.trim()) return;
    const newLyric: LyricLine = { time: Math.round(musicCurrentTime), text: lyricEditor.currentInput };
    setLyricEditor((prev) => ({ ...prev, lyricsBeingEdited: [...prev.lyricsBeingEdited, newLyric].sort((a, b) => a.time - b.time), currentInput: "" }));
  };

  const saveLyricsToPlaylist = () => {
    const jsonText = JSON.stringify(lyricEditor.lyricsBeingEdited, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => alert("✅ ¡Letras copiadas al portapapeles!")).catch(() => alert("❌ Error al copiar:\n\n" + jsonText));
    setLyricEditor({ isEditing: false, trackIndex: -1, lyricsBeingEdited: [], currentInput: "" });
  };

  const removeLyric = (index: number) => {
    setLyricEditor((prev) => ({ ...prev, lyricsBeingEdited: prev.lyricsBeingEdited.filter((_, i) => i !== index) }));
  };

  const cancelLyricEditing = () => {
    setLyricEditor({ isEditing: false, trackIndex: -1, lyricsBeingEdited: [], currentInput: "" });
  };

  const toggleLike = (trackIndex: number) => {
    setSidebarPlaylist((prev) => { const updated = [...prev]; updated[trackIndex] = { ...updated[trackIndex], liked: !updated[trackIndex].liked }; return updated; });
  };

  const filteredPlaylist = showOnlyLiked ? sidebarPlaylist.filter((t) => t.liked) : sidebarPlaylist;

  const handleSpotifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifySearchQuery.trim() || !isSpotifyConnected) return;
    setIsSpotifySearching(true);
    try {
      const results = await searchSpotifyTracks(spotifySearchQuery);
      setSpotifySearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      alert("Búsqueda fallida. Token expirado?");
      setIsSpotifyConnected(false);
    } finally {
      setIsSpotifySearching(false);
    }
  };

  const loadLyrics = async (artist: string, title: string) => {
    setIsLoadingLyrics(true);
    setShowLyricsPanel(true);
    try {
      const result = await getLyricsWithFallback(artist, title);
      setCurrentLyrics(result.found ? result.lyrics : "No lyrics found 😞");
    } catch {
      setCurrentLyrics("Error loading lyrics");
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const currentBg = tabBackgrounds[activeTab] ?? "";

  // Tab labels with emojis — cambia los emojis aquí si quieres quitarlos
  const TAB_LABELS: Record<string, string> = {
    home:     " home",
    projects: " projects",
    apps:     " apps",
    ia:       " IA",
    music:    " Music",
    info:     "ℹ Info",
    contact:  " Contacto",
    settings: "Configuración",
  };

  return (
    <div className="relative flex h-screen min-h-0 text-white overflow-hidden bg-black">

      {/* FONDO BASE */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px] opacity-20 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(white_2px,transparent_2px)] [background-size:60px_60px] opacity-10" />
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-500/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* FONDO DE TAB */}
      <AnimatePresence>
        {currentBg && (
          <motion.div key={currentBg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundImage: `url(${currentBg})`, backgroundSize: "cover", backgroundPosition: "center bottom", backgroundRepeat: "no-repeat", opacity: 0.18 }}
          />
        )}
      </AnimatePresence>

      {/* MODAL LYRICS */}
      <AnimatePresence>
        {showLyrics && currentSidebarTrack.lyrics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md px-4"
            onClick={() => setShowLyrics(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ duration: 0.3 }}
              className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${currentSidebarTrack.lyricsImage || currentSidebarTrack.art})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/95" />
              </div>
              <div className="relative z-10 flex flex-col h-full p-8">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <div className="flex items-center gap-4">
                    <img src={currentSidebarTrack.art} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/20" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-400">Ahora reproduciendo</p>
                      <h3 className="text-2xl font-bold text-white">{currentSidebarTrack.title}</h3>
                      <p className="text-sm text-zinc-300">{currentSidebarTrack.artist}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLyrics(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex-1 flex flex-col justify-center min-h-0 mb-6">
                  <div className="space-y-6 h-96">
                    {currentSidebarTrack.lyrics?.map((line, i) => {
                      const totalLines = currentSidebarTrack.lyrics?.length || 0;
                      const startIndex = Math.max(0, currentLyricIndex - 2);
                      const endIndex = Math.min(totalLines, startIndex + 5);
                      const shouldShow = i >= startIndex && i < endIndex;
                      return (
                        <motion.div key={i} data-lyric={i} initial={{ opacity: 0 }} animate={shouldShow ? { opacity: i === currentLyricIndex ? 1 : 0.5 } : { opacity: 0 }} transition={{ duration: 0.3 }}
                          className={`text-center transition-all min-h-[3.5rem] flex items-center justify-center ${i === currentLyricIndex ? "text-2xl font-bold text-white drop-shadow-lg" : "text-lg text-zinc-300"} ${!shouldShow ? 'hidden' : ''}`}>
                          {line.text}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 border-t border-white/10 pt-6">
                  <div className="mb-4 flex items-center gap-2 text-xs text-zinc-400">
                    <span>{formatMusicTime(musicCurrentTime)}</span>
                    <div ref={progressBarLyricsRef} className="flex-1 h-2 rounded-full bg-white/20 cursor-pointer group" onClick={(e) => seekMusicLyrics(e.clientX)}>
                      <div className="h-full bg-white rounded-full group-hover:bg-purple-400 transition-colors" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span>{Number.isFinite(musicDuration) && musicDuration > 0 ? formatMusicTime(musicDuration) : "--:--"}</span>
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <button onClick={goPrevTrack} className="text-zinc-400 hover:text-white transition"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 5V7l-8.5 5z" /></svg></button>
                    <button onClick={() => { if (musicPlaying) setMusicPlaying(false); else { const a = audioRef.current; if (a && musicDuration > 0 && musicCurrentTime >= musicDuration - 0.3) { a.currentTime = 0; setMusicCurrentTime(0); } setMusicPlaying(true); } }} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black hover:scale-110 transition">
                      {musicPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" /></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg>}
                    </button>
                    <button onClick={goNextTrack} className="text-zinc-400 hover:text-white transition"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 18l8.5-5L6 8v10z" /></svg></button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDITOR LETRAS */}
      <AnimatePresence>
        {lyricEditor.isEditing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
            onClick={() => cancelLyricEditing()}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border border-purple-500/30"
              onClick={(e) => e.stopPropagation()}>
              <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/40">
                <div><h3 className="text-2xl font-bold text-white">Editor de Letras</h3><p className="text-sm text-zinc-400">{sidebarPlaylist[lyricEditor.trackIndex]?.title}</p></div>
                <button onClick={cancelLyricEditing} className="p-2 hover:bg-white/10 rounded-full transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex flex-col h-full min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-3 [-webkit-scrollbar:none] [scrollbar-width:none]">
                  <p className="text-sm text-zinc-400 font-semibold mb-4">Letras ({lyricEditor.lyricsBeingEdited.length})</p>
                  {lyricEditor.lyricsBeingEdited.length === 0 ? <p className="text-zinc-500 text-center py-8">Sin letras aún.</p> : (
                    <div className="space-y-3">
                      {lyricEditor.lyricsBeingEdited.map((lyric, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                          className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="flex-1 min-w-0"><p className="text-sm text-zinc-400">{formatMusicTime(lyric.time)}</p><p className="text-white font-medium truncate">{lyric.text}</p></div>
                          <button onClick={() => removeLyric(i)} className="ml-4 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 border-t border-white/10 bg-black/40 p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm"><span className="text-zinc-400">Tiempo actual:</span><span className="text-2xl font-bold text-purple-400">{formatMusicTime(musicCurrentTime)}</span></div>
                  <div className="flex gap-3">
                    <input type="text" value={lyricEditor.currentInput} onChange={(e) => setLyricEditor((prev) => ({ ...prev, currentInput: e.target.value }))} onKeyPress={(e) => { if (e.key === "Enter") addLyricAtCurrentTime(); }} placeholder="Escribe la letra aquí..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition" />
                    <button onClick={addLyricAtCurrentTime} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition shrink-0">➕ Agregar</button>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={goPrevTrack} className="p-3 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 5V7l-8.5 5z" /></svg></button>
                    <button onClick={() => setMusicPlaying((v) => !v)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black hover:scale-110 transition shrink-0">
                      {musicPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" /></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg>}
                    </button>
                    <button onClick={goNextTrack} className="p-3 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 18l8.5-5L6 8v10z" /></svg></button>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={cancelLyricEditing} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition border border-white/10">Cancelar</button>
                    <button onClick={saveLyricsToPlaylist} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copiar Letras
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPOUT PERFIL COLABORADOR (estilo Discord, al lado del sidebar) */}
      <AnimatePresence>
        {selectedCollaborator && profileAnchor && (
          <DiscordProfilePopout
            user={selectedCollaborator}
            anchor={profileAnchor}
            onClose={closeCollaboratorProfile}
          />
        )}
      </AnimatePresence>

      {/* MODAL VIDEO */}
      <AnimatePresence>
        {videoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-[60px] px-6 py-10"
            role="dialog" aria-modal="true" onClick={closeProjectVideo}>
            <button type="button" onClick={closeProjectVideo} className="fixed right-6 top-6 z-[110] flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-[1200px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-20">
                <div className="relative min-w-0 flex-[1.3]">
                  <div className="relative rounded-2xl overflow-hidden bg-black shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
                    <video ref={previewVideoRef} key={videoModal.src} src={videoModal.src} controls playsInline preload="metadata" className="block w-full max-h-[min(58vh,580px)] bg-black object-contain" />
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 lg:max-w-[400px] lg:shrink-0">
                  <h3 className="text-[1.9rem] sm:text-[2.4rem] font-bold leading-tight tracking-tight text-white">{videoModal.heading}</h3>
                  <p className="text-[0.9375rem] sm:text-base leading-[1.75] text-white/75">{videoModal.body}</p>
                  {videoModal.downloadUrl && (
                    <a href={videoModal.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center justify-center rounded-xl bg-cyan-400 hover:bg-cyan-300 px-10 py-3.5 text-[15px] font-bold text-black transition-all hover:scale-105">Download</a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0 min-w-0 w-full items-stretch gap-0 z-10 pl-6 pr-3 pt-0 pb-16 md:pl-14 md:pr-8 md:pb-[4.75rem]"
        style={{ perspective: "1000px", perspectiveOrigin: "50% 45%", transformStyle: "preserve-3d" }}>

        {/* LEFT SIDEBAR */}
        <div className={`w-72 ${cardSurfaceClass} p-5 pl-6 hidden md:flex flex-col overflow-hidden min-h-0 shrink-0 rounded-3xl self-stretch my-3 md:my-4 will-change-transform md:ml-1`}
          style={{ transform: "translate3d(12px, 0, 0) rotateY(32deg)", transformOrigin: "right center" }}>
          <div className="flex min-h-0 flex-1 flex-col gap-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:gap-8 md:pt-6 overflow-y-auto [-webkit-scrollbar:none] [scrollbar-width:none]">
            {/* ── CALENDARIO CORREGIDO ── */}
            <div className="shrink-0">
              <h2 className="text-xl font-bold mb-1">{MONTHS_ES[currentMonth]} {currentYear}</h2>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500 mb-1">
                {["D","L","M","X","J","V","S"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Empty cells for first day offset */}
                {[...Array(new Date(currentYear, currentMonth, 1).getDay())].map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDay;
                  return (
                    <motion.div whileHover={{ scale: 1.2 }} key={day}
                      className={`p-1.5 rounded-lg font-medium ${isToday ? "bg-yellow-400 text-black" : "bg-white/5 hover:bg-white/10 text-zinc-300"}`}>
                      {day}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Reproductor */}
            <div className="mt-auto flex min-h-0 flex-col items-center w-full pb-2">
              <audio ref={audioRef} className="hidden" src={currentSidebarTrack.src} preload="metadata"
                onTimeUpdate={() => { const el = audioRef.current; if (el) setMusicCurrentTime(el.currentTime); }}
                onLoadedMetadata={() => { const el = audioRef.current; if (el && Number.isFinite(el.duration)) setMusicDuration(el.duration); }}
                onDurationChange={() => { const el = audioRef.current; if (el && Number.isFinite(el.duration)) setMusicDuration(el.duration); }}
                onEnded={handleAudioEnded} />
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl scale-110" aria-hidden />
                <img src={currentSidebarTrack.art} alt="" className="relative w-[7.5rem] h-[7.5rem] rounded-full object-cover ring-2 ring-white/35 shadow-[0_0_36px_rgba(255,255,255,0.18)]" />
              </div>
              <h3 className="text-center text-sm font-semibold tracking-tight text-white px-1 leading-snug">{currentSidebarTrack.title}</h3>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 max-w-full">
                <span className="opacity-80"></span>
                <span className="truncate">{currentSidebarTrack.artist}</span>
              </div>
              <div className="mt-5 flex items-center justify-center gap-5 w-full">
                <button type="button" onClick={() => setShuffleOn((v) => !v)} className={`p-1 transition ${shuffleOn ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6a3.7 3.7 0 0 1 3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1 0 2 .4 2.6 1.2l6.6 8.4a3 3 0 0 0 2.4 1.2H22" /><path d="m18 14 4 4-4 4" /></svg>
                </button>
                <button type="button" onClick={goPrevTrack} className="p-1 text-zinc-400 hover:text-white transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 5V7l-8.5 5z" /></svg>
                </button>
                <button type="button" onClick={() => { if (musicPlaying) setMusicPlaying(false); else { const a = audioRef.current; if (a && musicDuration > 0 && musicCurrentTime >= musicDuration - 0.3) { a.currentTime = 0; setMusicCurrentTime(0); } setMusicPlaying(true); } }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg hover:scale-105 transition">
                  {musicPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" /></svg> : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg>}
                </button>
                <button type="button" onClick={goNextTrack} className="p-1 text-zinc-400 hover:text-white transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 18l8.5-5L6 8v10z" /></svg>
                </button>
                <button type="button" onClick={() => setRepeatOn((v) => !v)} className={`p-1 transition ${repeatOn ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                </button>
              </div>
              <div className="mt-5 w-full flex items-center gap-2 text-[10px] tabular-nums text-zinc-500">
                <span>{formatMusicTime(musicCurrentTime)}</span>
                <div ref={progressBarRef} role="slider" tabIndex={0} aria-valuenow={Math.round(musicCurrentTime)} aria-valuemin={0} aria-valuemax={Math.max(1, Math.floor(musicDuration))}
                  className="flex-1 h-1.5 rounded-full bg-white/15 cursor-pointer relative overflow-hidden" onClick={(e) => seekMusic(e.clientX)}
                  onKeyDown={(e) => { const a = audioRef.current; if (!a || !Number.isFinite(musicDuration) || musicDuration <= 0) return; if (e.key === "ArrowRight") a.currentTime = Math.min(musicDuration, a.currentTime + 5); if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5); }}>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-150 ease-linear" style={{ width: `${progressPct}%` }} />
                </div>
                <span>{Number.isFinite(musicDuration) && musicDuration > 0 ? formatMusicTime(musicDuration) : "--:--"}</span>
              </div>
              <div className="mt-4 flex w-full items-center justify-between px-0.5 text-zinc-500">
                <button type="button" onClick={() => setShowLyrics(true)} className="p-1.5 hover:text-white transition opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c.5 0 1 .5 1 1v4c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1m6-3c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3h-2m-8 0H8c-1.7 0-3-1.3-3-3V9c0-1.7 1.3-3 3-3h2m0 0V6c0-1.7-1.3-3-3-3s-3 1.3-3 3v2m8 0V6c0-1.7 1.3-3 3-3s3 1.3 3 3v2" /></svg>
                </button>
                <button type="button" className="p-1.5 hover:text-white transition opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" /></svg>
                </button>
                <button type="button" className="p-1.5 hover:text-white transition opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4V6zm2 4h12a2 2 0 012 2v6H4v-6a2 2 0 012-2zm4 2v2h4v-2h-4z" /></svg>
                </button>
                <div className="flex items-center gap-1.5 min-w-[4.5rem]">
                  <svg className="w-4 h-4 shrink-0 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M3 10v4c0 .55.45 1 1 1h3l4 4V5L7 9H4c-.55 0-1 .45-1 1zm13.5 2A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                  <input type="range" min={0} max={1} step={0.05} value={sidebarVolume} onChange={(e) => setSidebarVolume(Number(e.target.value))} className="h-1 w-full max-w-[3.25rem] cursor-pointer accent-white opacity-80" />
                </div>
                <button type="button" className="p-1.5 hover:text-white transition opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm-2 4h-4V9h4v2zM5 3h6v2H5v14h6v2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" /></svg>
                </button>
                <button type="button" className="p-1.5 hover:text-white transition opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 min-w-0 min-h-0 p-6 flex flex-col relative z-[1] will-change-transform" style={{ transform: "translateZ(40px)" }}>
          {/* TABS CON EMOJIS */}
          <div className="flex items-center gap-6 mb-6 text-sm text-zinc-400 flex-wrap shrink-0">
            {["home", "projects", "apps", "ia", "music", "info", "contact"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`font-semibold transition ${activeTab === tab ? "text-white" : "hover:text-white"} ${tab === "ia" ? "text-purple-400 hover:text-purple-300" : ""} ${tab === "contact" ? "text-cyan-400 hover:text-cyan-300" : ""}`}>
                {TAB_LABELS[tab] ?? tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              title="Configuración"
              aria-label="Configuración"
              className={`ml-1 flex h-8 w-8 items-center justify-center rounded-full transition ${activeTab === "settings" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden [-webkit-scrollbar:none] [scrollbar-width:none] pr-2">

            {activeTab === "home" && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div key={selected.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }}
                    role="button" tabIndex={0} onClick={() => openProjectVideo(selected)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProjectVideo(selected); } }}
                    className="relative overflow-hidden rounded-3xl border border-white/20 shadow-[0_8px_28px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.08] p-8 mb-8 flex justify-between items-center before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/[0.04] before:to-transparent cursor-pointer outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.018)" }}>
                    <div>
                      <h1 className="text-5xl font-bold">{selected.title}</h1>
                      <p className="text-zinc-400 mt-3 max-w-md">{selected.description}</p>
                      <div className="flex gap-4 mt-6">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openProjectVideo(selected); }} className="bg-white text-black px-6 py-2 rounded-xl font-semibold hover:scale-110 transition">▶ Open</button>
                        <button type="button" onClick={(e) => e.stopPropagation()} className="bg-white/10 px-6 py-2 rounded-xl hover:bg-white/20 transition">Details</button>
                      </div>
                    </div>
                    <img key={selected.img} src={selected.img} alt="" width={320} height={200} decoding="async" fetchPriority="high"
                      className="pointer-events-none h-[13.5rem] w-[20rem] max-w-[min(20rem,38vw)] shrink-0 select-none rounded-2xl border border-white/20 object-cover shadow-xl" />
                  </motion.div>
                </AnimatePresence>
                <h2 className="mb-4 text-lg font-semibold">Projects</h2>
                <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-2 pr-6 [-webkit-scrollbar:none] [scrollbar-width:none]">
                  {movies.map((movie, i) => (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={i}
                      onClick={() => { setSelected(movie); setIndex(i); openProjectVideo(movie); }}
                      className={`w-[160px] shrink-0 cursor-pointer ${i === index ? "ring-2 ring-white/40 rounded-2xl" : ""}`}>
                      <div className="w-[160px] h-[220px] rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                        <img src={movie.img} alt={movie.title} className="w-full h-full object-cover" />
                      </div>
                      <p className="mt-2 text-sm text-center truncate">{movie.title}</p>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "projects" && (
              <div className="space-y-6 pb-8">
                <h1 className="text-4xl font-bold"> Projects</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {movies.map((movie, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05 }} onClick={() => openProjectVideo(movie)} className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 cursor-pointer">
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-3"><img src={movie.img} className="w-full h-full object-cover" /></div>
                      <h3 className="text-lg font-semibold">{movie.title}</h3>
                      <p className="text-sm text-zinc-400 mt-2">{movie.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "apps" && (
              <div className="space-y-6 pb-8">
                <h1 className="text-4xl font-bold"> Apps</h1>
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8">
                  <p className="text-zinc-300 text-lg">Aquí puedes ver todas las aplicaciones disponibles. Próximamente más apps.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/5 p-6 rounded-2xl border border-white/10"><h3 className="text-xl font-bold mb-2">App 1</h3><p className="text-zinc-400">Descripción de la aplicación</p></motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/5 p-6 rounded-2xl border border-white/10"><h3 className="text-xl font-bold mb-2">App 2</h3><p className="text-zinc-400">Descripción de la aplicación</p></motion.div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ia" && (
              <motion.div className="flex min-h-0 flex-1 flex-col pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <div className="shrink-0 mb-4 md:mb-6">
                  <h1 className="text-2xl font-bold">Gemini IA</h1>
                  <p className="text-xs text-zinc-500">Powered by Google Gemini</p>
                </div>
                <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 [-webkit-scrollbar:none] [scrollbar-width:none]">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[12rem] gap-3 text-zinc-600">
                      <span className="text-5xl">✨</span>
                      <p className="text-sm">Escribe algo para empezar a chatear con Gemini</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-purple-600 text-white rounded-br-sm" : "bg-white/8 border border-white/10 text-zinc-200 rounded-bl-sm"}`}>
                        {msg.role === "ai" && <span className="text-purple-400 font-semibold text-xs block mb-1">Gemini</span>}
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/8 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                        <span className="text-purple-400 font-semibold text-xs block mb-1">Gemini</span>
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex shrink-0 gap-3 items-end">
                  <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToGemini(chatInput); } }}
                    placeholder="Escribe un mensaje... (Enter para enviar)" rows={2}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none outline-none focus:border-purple-500/50 transition [overflow-anchor:none]" />
                  <button onClick={() => sendToGemini(chatInput)} disabled={chatLoading || !chatInput.trim()}
                    className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "music" && (
              <motion.div className="space-y-6 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-bold">{showOnlyLiked ? " Mis Likes" : " Music"}</h1>
                    {playlistSource === "spotify" && (
                      <p className="text-sm text-green-400/90 mt-1">
                        {isLoadingSpotifyLibrary ? "Cargando tus likes de Spotify…" : `${sidebarPlaylist.length} canciones guardadas en Spotify`}
                      </p>
                    )}
                    {playlistSource === "local" && !isSpotifyConnected && (
                      <p className="text-sm text-zinc-500 mt-1">Playlist local · conecta Spotify para cargar tus likes automáticamente</p>
                    )}
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto flex-wrap">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowOnlyLiked(!showOnlyLiked)}
                      className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${showOnlyLiked ? "bg-red-600/80 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                      {showOnlyLiked ? "Ver Todas" : " Ver Likes"}
                    </motion.button>
                    {isSpotifyConnected ? (
                      <>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => void loadPlaylist()} disabled={isLoadingSpotifyLibrary}
                          className="px-4 py-2 rounded-lg font-semibold transition bg-green-600/80 hover:bg-green-600 text-white disabled:opacity-50">
                          {isLoadingSpotifyLibrary ? "…" : "Actualizar"}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSpotifyDisconnect}
                          className="px-4 py-2 rounded-lg font-semibold transition bg-white/10 hover:bg-white/20 text-white">
                          Desconectar
                        </motion.button>
                      </>
                    ) : (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => startSpotifyLogin()}
                        className="px-4 py-2 rounded-lg font-semibold transition bg-green-600 hover:bg-green-500 text-white">
                        Conectar Spotify
                      </motion.button>
                    )}
                  </div>
                </div>

                {!isSpotifyConfigured() && (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200/90 space-y-2">
                    <p><strong>Spotify no está configurado.</strong> Solo necesitas el Client ID (no hace falta Client Secret).</p>
                    <ol className="list-decimal list-inside space-y-1 text-yellow-100/80">
                      <li>Entra a <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">developer.spotify.com/dashboard</a> y crea una app</li>
                      <li>En Settings → Redirect URIs agrega: <code className="text-yellow-100">http://localhost:3000/callback</code></li>
                      <li>Copia <code className="text-yellow-100">.env.example</code> a <code className="text-yellow-100">.env.local</code> y pega tu Client ID</li>
                      <li>Reinicia el servidor con <code className="text-yellow-100">npm run dev</code></li>
                    </ol>
                  </div>
                )}

                {isLoadingSpotifyLibrary && (
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <span className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    Sincronizando canciones guardadas…
                  </div>
                )}

                {isSpotifyConnected && (
                  <form onSubmit={handleSpotifySearch} className="flex gap-3">
                    <input type="text" value={spotifySearchQuery} onChange={(e) => setSpotifySearchQuery(e.target.value)} placeholder="Buscar canción en Spotify..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition" />
                    <button type="submit" disabled={isSpotifySearching} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg font-semibold transition">
                      {isSpotifySearching ? "..." : ""}
                    </button>
                  </form>
                )}

                {spotifySearchResults.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-zinc-400 font-semibold">Resultados de Spotify ({spotifySearchResults.length})</p>
                    {spotifySearchResults.map((track, idx) => (
                      <motion.div key={`${track.id}-${idx}`} whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white/5 border border-white/10 hover:border-purple-500/30 transition">
                        <img src={track.image} alt={track.name} className="w-12 h-12 rounded object-cover" />
                        <div className="flex-1 min-w-0" onClick={() => loadLyrics(track.artist, track.name)}>
                          <p className="text-white font-medium truncate">{track.name}</p>
                          <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); loadLyrics(track.artist, track.name); }} className="p-2 hover:bg-white/10 rounded transition shrink-0" title="Ver letras">🎤</button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-[2rem_1fr_1fr_4rem] gap-4 px-4 text-xs uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-3">
                  <span className="text-center">#</span><span>Título</span><span>Álbum</span><span className="text-right">Duración</span>
                </div>

                {filteredPlaylist.length === 0 ? (
                  <div className="text-center py-12"><p className="text-zinc-400 text-lg">No hay canciones {showOnlyLiked ? "con likes" : ""}</p></div>
                ) : (
                  <div className="space-y-1">
                    {filteredPlaylist.map((track, i) => {
                      const originalIndex = sidebarPlaylist.findIndex((t) => t.title === track.title && t.artist === track.artist);
                      const isActive = musicTrackIndex === originalIndex;
                      return (
                        <motion.div key={`${track.title}-${i}`} whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                          className={`grid grid-cols-[2rem_1fr_1fr_4rem] gap-4 items-center px-4 py-3 rounded-xl cursor-pointer group transition-colors ${isActive ? "bg-white/10" : ""}`}>
                          <div className="flex items-center justify-center text-sm tabular-nums">
                            {isActive && musicPlaying ? (
                              <span className="text-purple-400"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" /></svg></span>
                            ) : (
                              <>
                                <span className={`group-hover:hidden ${isActive ? "hidden" : "text-zinc-500"}`}>{i + 1}</span>
                                <span className="hidden group-hover:block text-white cursor-pointer" onClick={() => playTrack(originalIndex)}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" /></svg></span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => playTrack(originalIndex)}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
                              {track.art ? <img src={track.art} alt={track.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg></div>}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? "text-purple-400" : "text-white"}`}>{track.title || "—"}</p>
                              <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-500 truncate hidden sm:block">{track.album || "—"}</p>
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={(e) => { e.stopPropagation(); toggleLike(originalIndex); }}
                              className={`p-2 rounded-lg transition ${track.liked ? "text-red-500 hover:text-red-400" : "text-zinc-400 hover:text-white"}`}>
                              <svg className="w-4 h-4" fill={track.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                            <p className="text-sm text-zinc-500 text-right tabular-nums w-10">
                              {isActive && musicDuration > 0
                                ? formatMusicTime(musicDuration)
                                : track.durationSec
                                  ? formatMusicTime(track.durationSec)
                                  : "—"}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {showLyricsPanel && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                      className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-lg p-6 max-h-96 overflow-y-auto backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">🎤 Letras</h3>
                        <button onClick={() => setShowLyricsPanel(false)} className="text-zinc-400 hover:text-white transition">✕</button>
                      </div>
                      {isLoadingLyrics ? (
                        <div className="text-zinc-400 text-center py-8"><p className="mt-2">Cargando letras...</p></div>
                      ) : (
                        <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{currentLyrics}</pre>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === "info" && (
              <motion.div className="space-y-10 pb-8 max-w-3xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <header className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-transparent bg-gradient-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text">ℹ️ Información</h1>
                  <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-zinc-500">Legal · equipo · contacto</p>
                  <div className="h-px max-w-xs bg-gradient-to-r from-purple-500/70 via-fuchsia-500/40 to-transparent rounded-full" />
                </header>
                <div className="space-y-10">
                  {[
                    { title: "melody team", delay: 0.1, content: ["Agradecimientos a los colaboradores soydemara, zee, ayka, shiori, unknown — sin ellos no sería posible esto."] },
                    { title: "Créditos", delay: 0.2, content: ["Esta web fue desarrollada por mi mascota Melody🎀, todos los créditos a ella."] },
                    { title: "Muy pronto", delay: 0.3, content: ["Fix a dispositivos móviles, IA funcionable, apps de optimización y hacking ético."] },
                  ].map(({ title, delay, content }) => (
                    <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="space-y-4">
                      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                        <span className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" aria-hidden />{title}
                      </h2>
                      {content.map((p, j) => <p key={j} className="text-zinc-300/95 text-[15px] sm:text-base leading-[1.8] tracking-wide">{p}</p>)}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "contact" && (
              <motion.div className="flex min-h-0 flex-1 flex-col pb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-4">💬 Contacto</h1>
                <div className="relative flex min-h-[min(420px,58vh)] flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="relative z-10 grid flex-1 grid-cols-1 gap-5 p-5 pb-2 md:min-h-[min(380px,52vh)] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3 md:p-6 md:pb-3 lg:gap-5">
                    <div className="flex justify-center md:justify-start md:self-end">
                      <img src={contactHeroImage} alt="" className="max-h-[min(340px,48vh)] w-full max-w-[min(100%,400px)] object-contain object-bottom select-none" decoding="async" />
                    </div>
                    <div className="flex flex-col items-center justify-center justify-self-center">
                      <div className="relative w-fit max-w-[min(90vw,18rem)]">
                        <div className="relative w-fit rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-center text-[14px] leading-snug text-zinc-100 shadow-lg backdrop-blur-md">
                          <p className="whitespace-pre-wrap break-words">{contactBubbleText}</p>
                          <span className="pointer-events-none absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/15 bg-white/10" aria-hidden />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center md:justify-end md:self-end">
                      <img src={contactHeroImageRight} alt="" className="max-h-[min(340px,48vh)] w-full max-w-[min(100%,400px)] object-contain object-bottom select-none" decoding="async" />
                    </div>
                  </div>
                  <div className="relative z-20 mt-auto flex flex-wrap items-center justify-center gap-8 border-t border-white/10 bg-black/25 px-4 py-6 backdrop-blur-sm">
                    <a href={contactLinks.telegram} target="_blank" rel="noopener noreferrer" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-lg transition hover:scale-105 hover:brightness-110">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
                    </a>
                    <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:brightness-110">
                      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </a>
                    <a href={contactLinks.discord} target="_blank" rel="noopener noreferrer" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-lg transition hover:scale-105 hover:brightness-110">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.074.074 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div className="space-y-10 pb-8 max-w-3xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <header className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-transparent bg-gradient-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text">⚙️ Configuración</h1>
                  <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-zinc-500">Tarjetas · fondos</p>
                  <div className="h-px max-w-xs bg-gradient-to-r from-purple-500/70 via-fuchsia-500/40 to-transparent rounded-full" />
                </header>

                {/* Opción 1: transparencia de tarjetas */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                    <span className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" aria-hidden />
                    Tarjetas de Calendario y Colaboradores
                  </h2>
                  <p className="text-zinc-300/95 text-[15px] sm:text-base leading-[1.8] tracking-wide">
                    Elige si las tarjetas del calendario y de colaboradores se ven transparentes o con su estilo original.
                  </p>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 max-w-md">
                    <div>
                      <p className="text-sm font-semibold text-white">Tarjetas transparentes</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Predeterminado: apagado (estilo original)</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cardsTransparent}
                      onClick={() => setCardsTransparent((v) => !v)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${cardsTransparent ? "bg-purple-500" : "bg-white/15"}`}
                    >
                      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${cardsTransparent ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </motion.div>

                {/* Opción 2: fondo por página */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                    <span className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" aria-hidden />
                    Fondo de cada página
                  </h2>
                  <p className="text-zinc-300/95 text-[15px] sm:text-base leading-[1.8] tracking-wide">
                    Cambia el fondo de cada pestaña por separado. Las imágenes disponibles se agregan desde el código (arreglo <code className="text-purple-300">AVAILABLE_BACKGROUNDS</code>) usando tus links de Imgur.
                  </p>
                  <div className="space-y-6">
                    {BACKGROUND_TABS.map((tab) => (
                      <div key={tab} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-white capitalize">{TAB_LABELS[tab]?.trim() || tab}</p>
                          <button
                            type="button"
                            onClick={() => resetTabBackground(tab)}
                            className="text-xs text-zinc-400 hover:text-white transition"
                          >
                            Restaurar original
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {AVAILABLE_BACKGROUNDS.map((bg) => {
                            const isSelected = tabBackgrounds[tab] === bg.url;
                            return (
                              <button
                                key={bg.url + bg.name}
                                type="button"
                                onClick={() => setTabBackground(tab, bg.url)}
                                title={bg.name}
                                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${isSelected ? "border-purple-400 ring-2 ring-purple-400/40" : "border-white/10 hover:border-white/30"}`}
                              >
                                <img src={bg.url} alt={bg.name} className="h-full w-full object-cover" />
                                {isSelected && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

          </div>
        </div>

        {/* RIGHT SIDEBAR — Collaborators + Reloj + Clima */}
        <div className={`relative w-80 ${cardSurfaceClass} p-5 hidden lg:flex lg:flex-col overflow-y-auto shrink-0 rounded-3xl self-stretch my-3 md:my-4 will-change-transform [-webkit-scrollbar:none] [scrollbar-width:none]`}
          style={{ transform: "translateZ(0) rotateY(-32deg)", transformOrigin: "left center" }}>
          <h2 className="text-lg font-semibold mb-4">Collaborators</h2>
          <div className="space-y-1">
            {collaborators.map((user, i) => (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }}
                whileTap={{ scale: 0.98 }}
                key={i}
                onClick={(e) => openCollaboratorProfile(user, e.currentTarget)}
                className={`w-full bg-transparent p-3 rounded-xl flex items-center gap-3 text-left cursor-pointer transition-colors hover:bg-white/5 ${selectedCollaborator?.name === user.name ? "bg-white/10 ring-1 ring-white/20" : ""}`}
              >
                <div className="relative shrink-0">
                  <img src={user.img} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a]"
                    style={{ backgroundColor: STATUS_COLORS[user.status ?? "offline"] }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-tight text-white truncate">{user.displayName ?? user.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-purple-400/90 mt-0.5 truncate">{user.role}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* ── RELOJ 3D + CLIMA ── */}
          <Clock3D />
        </div>
      </div>

      {/* PLAYER BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-2xl border-t border-white/10 z-20">
        <div ref={bottomProgressBarRef} className="w-full h-[3px] bg-white/10 cursor-pointer group" onClick={(e) => seekMusicBottom(e.clientX)}>
          <div className="h-full bg-white group-hover:bg-purple-400 transition-colors duration-150" style={{ width: `${progressPct}%`, transition: "width 0.15s linear" }} />
        </div>
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {currentSidebarTrack.art && <img src={currentSidebarTrack.art} className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/20" alt="" />}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{currentSidebarTrack.title}</p>
              <p className="text-[11px] text-zinc-500 truncate">{currentSidebarTrack.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={goPrevTrack} className="text-zinc-400 hover:text-white transition">⏮</button>
            <button onClick={() => setMusicPlaying((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition text-sm font-bold">
              {musicPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={goNextTrack} className="text-zinc-400 hover:text-white transition">⏭</button>
          </div>
          <div className="flex-1 flex justify-end">
            <span className="text-xs text-zinc-500 tabular-nums">{formatMusicTime(musicCurrentTime)} / {musicDuration > 0 ? formatMusicTime(musicDuration) : "--:--"}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
