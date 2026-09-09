import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundConfig {
  [key: string]: string;
}

interface SettingsPanelProps {
  onSettingsChange: (settings: {
    cardTransparency: boolean;
    backgrounds: BackgroundConfig;
  }) => void;
  currentSettings: {
    cardTransparency: boolean;
    backgrounds: BackgroundConfig;
  };
}

const BACKGROUND_OPTIONS: Record<string, string> = {
  default: "https://i.imgur.com/Ompb0lt.png",
  dark: "https://i.imgur.com/3KZ4qX9.png",
  gradient: "https://i.imgur.com/jX5pK2L.png",
  neon: "https://i.imgur.com/8Z9mQ4W.png",
  custom: "custom",
};

const PAGES = ["home", "projects", "apps", "ia", "music"];

export default function SettingsPanel({
  onSettingsChange,
  currentSettings,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardTransparency, setCardTransparency] = useState(
    currentSettings.cardTransparency
  );
  const [backgrounds, setBackgrounds] = useState(currentSettings.backgrounds);
  const [selectedPage, setSelectedPage] = useState("home");
  const [customBackgroundInput, setCustomBackgroundInput] = useState("");

  useEffect(() => {
    onSettingsChange({
      cardTransparency,
      backgrounds,
    });
  }, [cardTransparency, backgrounds, onSettingsChange]);

  const handleTransparencyToggle = () => {
    setCardTransparency(!cardTransparency);
  };

  const handleBackgroundChange = (backgroundKey: string) => {
    if (backgroundKey === "custom") {
      // Aquí el usuario puede pegar su URL de Imgur
      return;
    }
    
    const newBackgrounds = {
      ...backgrounds,
      [selectedPage]: BACKGROUND_OPTIONS[backgroundKey],
    };
    setBackgrounds(newBackgrounds);
  };

  const handleCustomBackground = () => {
    if (customBackgroundInput.trim()) {
      const newBackgrounds = {
        ...backgrounds,
        [selectedPage]: customBackgroundInput.trim(),
      };
      setBackgrounds(newBackgrounds);
      setCustomBackgroundInput("");
    }
  };

  return (
    <>
      {/* Botón de Configuración */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
        title="Configuración"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m6.08 0l4.24-4.24M1 12h6m6 0h6m-1.78 7.78l-4.24-4.24m-6.08 0l-4.24 4.24" />
        </svg>
      </motion.button>

      {/* Panel Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 right-6 w-96 max-h-[80vh] overflow-y-auto rounded-2xl border border-white/20 bg-black/80 shadow-2xl backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">⚙️ Configuración</h2>
                  <p className="text-xs text-zinc-400">Personaliza tu experiencia</p>
                </div>

                {/* Opción 1: Transparencia de Tarjetas */}
                <div className="space-y-3 border-b border-white/10 pb-6">
                  <h3 className="font-semibold text-white">Transparencia de Tarjetas</h3>
                  <p className="text-xs text-zinc-400">Haz que las tarjetas (calendario, colaboradores) sean transparentes</p>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTransparencyToggle}
                    className={`relative w-full px-4 py-3 rounded-lg font-medium transition ${
                      cardTransparency
                        ? "bg-purple-600/70 hover:bg-purple-600 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cardTransparency ? "✓ Transparentes" : "Opacas (Original)"}</span>
                      <span className="text-xl">{cardTransparency ? "👻" : "🎴"}</span>
                    </div>
                  </motion.button>
                </div>

                {/* Opción 2: Cambio de Fondos */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Fondos por Página</h3>
                  <p className="text-xs text-zinc-400">Cambia el fondo de cada sección individualmente</p>

                  {/* Selector de Página */}
                  <div className="grid grid-cols-3 gap-2">
                    {PAGES.map((page) => (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedPage(page)}
                        className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                          selectedPage === page
                            ? "bg-cyan-500/70 text-white"
                            : "bg-white/10 hover:bg-white/20 text-zinc-300"
                        }`}
                      >
                        {page.charAt(0).toUpperCase() + page.slice(1)}
                      </motion.button>
                    ))}
                  </div>

                  {/* Opciones de Fondo */}
                  <div className="space-y-2">
                    {Object.entries(BACKGROUND_OPTIONS)
                      .filter(([key]) => key !== "custom")
                      .map(([key, url]) => (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBackgroundChange(key)}
                          className={`w-full px-3 py-2 rounded-lg font-medium text-sm transition ${
                            backgrounds[selectedPage] === url
                              ? "bg-green-600/70 text-white border border-green-400"
                              : "bg-white/10 hover:bg-white/20 text-white border border-transparent"
                          }`}
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </motion.button>
                      ))}
                  </div>

                  {/* Input para URL Personalizada */}
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <p className="text-xs font-medium text-zinc-300">URL Personalizada (Imgur)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://i.imgur.com/..."
                        value={customBackgroundInput}
                        onChange={(e) => setCustomBackgroundInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCustomBackground}
                        className="px-3 py-2 rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white font-medium text-sm transition"
                      >
                        Aplicar
                      </motion.button>
                    </div>
                    <p className="text-[10px] text-zinc-500">Pega la URL completa de tu imagen de Imgur</p>
                  </div>
                </div>

                {/* Info Actual */}
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-500">
                    Fondo actual en <strong>{selectedPage}</strong>:<br />
                    <code className="text-[10px] text-zinc-400 break-all">
                      {backgrounds[selectedPage] || "Default"}
                    </code>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
