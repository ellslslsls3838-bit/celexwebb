

const SPOTIFY_CLIENT_ID = "6d76c7c2a8b84a5ba0a3c8d9e1f2g3h4";
const SPOTIFY_REDIRECT_URI = "http://localhost:3000/callback";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export interface SpotifyToken {
  accessToken: string;
  expiresAt: number;
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

export async function startSpotifyLogin(): Promise<void> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: "streaming user-read-private user-read-email user-library-modify user-library-read",
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
  };

  localStorage.setItem("spotify_token", JSON.stringify(token));
  sessionStorage.removeItem("spotify_code_verifier");

  return data.access_token;
}

export function getSpotifyToken(): string | null {
  const tokenStr = localStorage.getItem("spotify_token");
  if (!tokenStr) return null;

  const token: SpotifyToken = JSON.parse(tokenStr);
  if (Date.now() > token.expiresAt) {
    localStorage.removeItem("spotify_token");
    return null;
  }

  return token.accessToken;
}

export function spotifyLogout(): void {
  localStorage.removeItem("spotify_token");
}

export async function searchSpotifyTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: limit.toString(),
  });

  const response = await fetch(`${SPOTIFY_API_URL}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Search failed");

  const data = await response.json();

  return data.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artist: track.artists[0].name,
    image: track.album.images[0]?.url || "https://via.placeholder.com/64",
    uri: track.uri,
    duration: track.duration_ms,
    source: "spotify",
  }));
}

export async function playSpotifyTrack(deviceId: string, trackUri: string): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const response = await fetch(`${SPOTIFY_API_URL}/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [trackUri] }),
  });

  if (!response.ok) throw new Error("Playback failed");
}

export async function pauseSpotifyPlayback(deviceId: string): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const response = await fetch(`${SPOTIFY_API_URL}/me/player/pause?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Pause failed");
}

export async function addToSpotifyLibrary(trackId: string): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const response = await fetch(`${SPOTIFY_API_URL}/me/tracks?ids=${trackId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to add track");
}

export async function removeFromSpotifyLibrary(trackId: string): Promise<void> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const response = await fetch(`${SPOTIFY_API_URL}/me/tracks?ids=${trackId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to remove track");
}

export async function getSpotifyDevices(): Promise<any[]> {
  const token = getSpotifyToken();
  if (!token) throw new Error("No Spotify token available");

  const response = await fetch(`${SPOTIFY_API_URL}/me/player/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to get devices");

  const data = await response.json();
  return data.devices;
}

export async function getCurrentTrack(): Promise<any> {
  const token = getSpotifyToken();
  if (!token) return null;

  const response = await fetch(`${SPOTIFY_API_URL}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  return response.json();
}