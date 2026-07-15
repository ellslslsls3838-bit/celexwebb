"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessTokenFromCode } from "@/lib/spotify";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("OAuth error:", error);
      router.push("/");
      return;
    }

    if (code) {
      getAccessTokenFromCode(code)
        .then(() => {
          router.push("/");
        })
        .catch((err) => {
          console.error("Token error:", err);
          router.push("/");
        });
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white text-xl">🎵 Conectando a Spotify...</p>
    </div>
  );
}