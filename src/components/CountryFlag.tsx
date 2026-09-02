import React, { useState } from "react";

interface CountryFlagProps {
  /** 2-letter ISO code or DXCC code, e.g. "DE", "US", "JA", "GB", "AQ", "UN" */
  countryCode?: string;
  /** Fallback emoji flag string, e.g. "🇩🇪" */
  fallbackEmoji?: string;
  /** Country name for alt/title, e.g. "Deutschland" */
  title?: string;
  /** CSS class names for styling, e.g. "w-4 h-3 rounded-xs" */
  className?: string;
  /** Size preset */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

// Convert emoji to Twemoji SVG codepoints as secondary SVG fallback
function emojiToTwemojiUrl(emoji: string): string | null {
  if (!emoji) return null;
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code) {
      codePoints.push(code.toString(16).toLowerCase());
      if (code > 0xffff) i++;
    }
  }
  const filtered = codePoints.filter((c) => c !== "fe0f");
  if (filtered.length === 0) return null;
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${filtered.join("-")}.svg`;
}

// Map custom / non-standard amateur radio codes to standard flag URLs
const SPECIAL_CODE_MAP: Record<string, string> = {
  UN: "un",
  AQ: "aq",
  EU: "eu",
  IC: "ic", // Canary Islands
  EA8: "ic",
  GB: "gb",
  UK: "gb",
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  fallbackEmoji,
  title,
  className = "",
  size = "sm",
}) => {
  const [errorLevel, setErrorLevel] = useState<number>(0);

  const cleanCode = countryCode?.trim().toUpperCase();
  const lowerCode = cleanCode ? (SPECIAL_CODE_MAP[cleanCode] || cleanCode.toLowerCase()) : null;

  // Primary source: FlagCDN SVG (high-quality, crisp vector flags for all countries)
  const flagCdnUrl = lowerCode && lowerCode !== "un_known" && lowerCode.length === 2
    ? `https://flagcdn.com/${lowerCode}.svg`
    : null;

  // Secondary source: Twemoji vector SVG from emoji
  const twemojiUrl = fallbackEmoji ? emojiToTwemojiUrl(fallbackEmoji) : null;

  const currentSrc = errorLevel === 0 && flagCdnUrl 
    ? flagCdnUrl 
    : errorLevel <= 1 && twemojiUrl 
    ? twemojiUrl 
    : null;

  // Size styling classes
  const sizeClasses = {
    xs: "w-3.5 h-2.5 min-w-[14px]",
    sm: "w-4.5 h-3.5 min-w-[18px]",
    md: "w-6 h-4 min-w-[24px]",
    lg: "w-8 h-5.5 min-w-[32px]",
    xl: "w-10 h-7 min-w-[40px]",
  }[size];

  if (!currentSrc || errorLevel >= 2) {
    // Ultimate fallback: display the emoji or country code
    return (
      <span 
        className={`inline-flex items-center justify-center font-mono font-bold select-none leading-none ${className}`}
        title={title}
      >
        {fallbackEmoji || cleanCode || "🏳️"}
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={title || cleanCode || "Flagge"}
      title={title}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setErrorLevel((prev) => prev + 1)}
      className={`inline-block object-cover rounded-[2px] shadow-xs border border-white/10 shrink-0 select-none pointer-events-none transition-transform ${sizeClasses} ${className}`}
    />
  );
};
