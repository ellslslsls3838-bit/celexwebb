export interface SpotifyToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  image: string;
  uri: string;
  duration: number;
  source: "spotify";
}

/** Formato listo para el reproductor de la sidebar */
export interface SpotifyPlaylistTrack {
  title: string;
  artist: string;
  art: string;
  src: string;
  album?: string;
  liked: boolean;
  source: "spotify";
  spotifyId: string;
  spotifyUri: string;
  durationSec?: number;
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
const SPOTIFY_REDIRECT_URI =
  process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/callback";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export function isSpotifyConfigured(): boolean {
  return SPOTIFY_CLIENT_ID.length > 0;
}

export async function startSpotifyLogin(): Promise<void> {
  if (!isSpotifyConfigured()) {
    alert(
      "Spotify no está configurado.\n\n" +
        "Crea una app en https://developer.spotify.com/dashboard\n" +
        "y agrega en .env.local:\n" +
        "NEXT_PUBLIC_SPOTIFY_CLIENT_ID=tu_client_id\n" +
        "NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback"
    );
    return;
  }

  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: "user-read-private user-read-email user-library-read",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function getAccessTokenFromCode(code: string): Promise<string> {
  const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
  if (!codeVerifier) throw new Error("No code verifier found");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Token request failed");

  const token: SpotifyToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token,
  };

  localStorage.setItem("spotify_token", JSON.stringify(token));
  sessionStorage.removeItem("spotify_code_verifier");

  return data.access_token;
}

async function refreshSpotifyAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Token refresh failed");

  const existing = localStorage.getItem("spotify_token");
  const prev: SpotifyToken | null = existing ? JSON.parse(existing) : null;

  const token: SpotifyToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token ?? prev?.refreshToken ?? refreshToken,
  };

  localStorage.setItem("spotify_token", JSON.stringify(token));
  return token.accessToken;
}

function readStoredToken(): SpotifyToken | null {
  if (typeof window === "undefined") return null;
  const tokenStr = localStorage.getItem("spotify_token");
  if (!tokenStr) return null;
  try {
    return JSON.parse(tokenStr) as SpotifyToken;
  } catch {
    localStorage.removeItem("spotify_token");
    return null;
  }
}

export async function getSpotifyToken(): Promise<string | null> {
  const token = readStoredToken();
  if (!token) return null;

  const expiresSoon = Date.now() > token.expiresAt - 60_000;
  if (!expiresSoon) return token.accessToken;

  if (token.refreshToken) {
    try {
      return await refreshSpotifyAccessToken(token.refreshToken);
    } catch {
      localStorage.removeItem("spotify_token");
      return null;
    }
  }

  localStorage.removeItem("spotify_token");
  return null;
}

/** Versión síncrona para comprobar si hay sesión (sin refrescar). */
export function hasSpotifySession(): boolean {
  const token = readStoredToken();
  return !!token?.accessToken;
}

export function spotifyLogout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("spotify_token");
  }
}

type SpotifyApiArtist = { name: string };
type SpotifyApiAlbum = { name: string; images?: { url: string }[] };
type SpotifyApiTrack = {
  id: string;
  name: string;
  uri: string;
  preview_url: string | null;
  duration_ms: number;
  artists: SpotifyApiArtist[];
  album: SpotifyApiAlbum;
  type: string;
};

type SpotifySavedItem = { track: SpotifyApiTrack | null };

function mapSavedTrack(track: SpotifyApiTrack): SpotifyPlaylistTrack {
  return {
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    art: track.album?.images?.[0]?.url ?? "",
    src: track.preview_url ?? "",
    album: track.album?.name,
    liked: true,
    source: "spotify",
    spotifyId: track.id,
    spotifyUri: track.uri,
    durationSec: Math.round(track.duration_ms / 1000),
  };
}

/** 
 * Canciones guardadas (likes) del usuario — GET /v1/me/tracks
 * Ahora trae TODAS las canciones sin límite (paginación automática)
 */
export async function fetchSpotifySavedTracks(): Promise<SpotifyPlaylistTrack[]> {
  const token = await getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const allTracks: SpotifyPlaylistTrack[] = [];
  let offset = 0;
  const pageSize = 50;
  let total = 1;

  while (offset < total) {
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${SPOTIFY_API_URL}/me/tracks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      spotifyLogout();
      throw new Error("Token expirado");
    }
    if (!response.ok) throw new Error("Failed to fetch saved tracks");

    const data = await response.json();
    total = data.total ?? 0;
    const items = (data.items ?? []) as SpotifySavedItem[];

    if (items.length === 0) break;

    for (const item of items) {
      const track = item.track;
      if (!track || track.type !== "track") continue;
      allTracks.push(mapSavedTrack(track));
    }

    offset += pageSize;
  }

  return allTracks;
}

export async function searchSpotifyTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const params = new URLSearchParams({ q: query, type: "track", limit: limit.toString() });

  const response = await fetch(`${SPOTIFY_API_URL}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Search failed");

  const data = await response.json();

  return data.tracks.items.map((track: SpotifyApiTrack) => ({
    id: track.id,
    name: track.name,
    artist: track.artists[0]?.name ?? "Unknown",
    image: track.album?.images?.[0]?.url ?? "",
    uri: track.uri,
    duration: track.duration_ms,
    source: "spotify" as const,
  }));
}

