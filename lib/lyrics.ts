export interface LyricsResult {
  found: boolean;
  lyrics: string;
}

/**
 * Intenta obtener letras de la canción usando la API pública de lyrics.ovh.
 * Si falla, devuelve { found: false, lyrics: "" }.
 */
export async function getLyricsWithFallback(
  artist: string,
  title: string
): Promise<LyricsResult> {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const res = await fetch(url);

    if (!res.ok) return { found: false, lyrics: "" };

    const data = await res.json();

    if (data?.lyrics && typeof data.lyrics === "string" && data.lyrics.trim().length > 0) {
      return { found: true, lyrics: data.lyrics.trim() };
    }

    return { found: false, lyrics: "" };
  } catch {
    return { found: false, lyrics: "" };
  }
}
