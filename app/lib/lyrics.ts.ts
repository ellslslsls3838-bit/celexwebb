

const LYRICS_API_URL = "https://api.lyrics.ovh/v1";

export interface LyricsData {
  lyrics: string;
  found: boolean;
}

function cleanSongName(title: string): string {
  return title
    .replace(/\s*\(feat\..+?\)/gi, "")
    .replace(/\s*\(remix\)/gi, "")
    .replace(/\s*\(.*?remix.*?\)/gi, "")
    .replace(/\s*-\s*(Extended|Remastered|Deluxe).*/gi, "")
    .trim();
}

export async function getLyrics(artist: string, title: string): Promise<LyricsData> {
  try {
    const cleanTitle = cleanSongName(title);
    const response = await fetch(`${LYRICS_API_URL}/${artist}/${cleanTitle}`);

    if (!response.ok) {
      const retryResponse = await fetch(`${LYRICS_API_URL}/${artist}/${title}`);
      if (!retryResponse.ok) {
        return { lyrics: "", found: false };
      }
      const data = await retryResponse.json();
      return { lyrics: data.lyrics, found: true };
    }

    const data = await response.json();
    return { lyrics: data.lyrics, found: true };
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return { lyrics: "", found: false };
  }
}

export async function getLyricsWithFallback(
  artist: string,
  title: string,
  retries: number = 3
): Promise<LyricsData> {
  for (let i = 0; i < retries; i++) {
    const result = await getLyrics(artist, title);
    if (result.found) return result;

    if (i === 1) {
      const cleanTitle = cleanSongName(title);
      const result2 = await getLyrics(artist, cleanTitle);
      if (result2.found) return result2;
    }
  }

  return { lyrics: "", found: false };
}

export function formatLyrics(lyrics: string): string[] {
  return lyrics
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}