import React, { useEffect, useState } from "react";
import "./CuneneVagasSplash.css";

interface SplashProps {
  onComplete?: () => void;
  duration?: number;
}

export default function CuneneVagasSplash({
  onComplete,
  duration = 2800,
}: SplashProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setLeaving(true);
    }, duration);

    const completeTimer = window.setTimeout(() => {
      onComplete?.();
    }, duration + 650);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={`cv-splash ${leaving ? "cv-splash-exit" : ""}`}
      role="status"
      aria-label="A carregar CuneneVagas"
    >
      <div className="cv-splash-background" />

      <div className="cv-splash-content">

        <div className="cv-gold-orbit">
          <span className="cv-orbit-light" />
        </div>

        <div className="cv-brand-symbol">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 38 L50 18 L80 38 V78 H20 Z"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M35 78 V51 H65 V78"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M42 51 V64 H58 V51"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>

        <h1 className="cv-splash-logo">
          Cunene<span>Vagas</span>
        </h1>

        <div className="cv-splash-line" />

        <p className="cv-splash-tagline">
          Entra na tua comunidade.
        </p>

        <p className="cv-splash-categories">
          Emprego <i /> Negócios <i /> Marketplace <i /> Conexões
        </p>

        <div className="cv-loading">
          <span className="cv-loading-ring" />
          <span>Preparando a tua experiência...</span>
        </div>

      </div>

      <div className="cv-splash-footer">
        CUNENE · ANGOLA
      </div>
    </div>
  );
}
