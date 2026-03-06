// ─────────────────────────────────────────────
// PIXEL ART CHARACTERS
// SVG-based pixel art for the game mascots
// ─────────────────────────────────────────────

import React from "react";

const PIXEL_STYLE = { imageRendering: "pixelated" };

export function PixelCat({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={PIXEL_STYLE}>
      {/* Ears */}
      <rect x="2" y="0" width="2" height="3" fill="#1a1a2e" />
      <rect x="12" y="0" width="2" height="3" fill="#1a1a2e" />
      <rect x="3" y="1" width="1" height="1" fill="#3d2c4e" />
      <rect x="12" y="1" width="1" height="1" fill="#3d2c4e" />
      {/* Head */}
      <rect x="2" y="3" width="12" height="8" fill="#1a1a2e" />
      {/* Eyes — green glow */}
      <rect x="4" y="5" width="2" height="2" fill="#a8e6cf" />
      <rect x="10" y="5" width="2" height="2" fill="#a8e6cf" />
      <rect x="5" y="5" width="1" height="1" fill="#fff" />
      <rect x="11" y="5" width="1" height="1" fill="#fff" />
      {/* Nose & smile */}
      <rect x="7" y="7" width="2" height="1" fill="#ff8ba7" />
      <rect x="6" y="8" width="1" height="1" fill="#ff8ba7" />
      <rect x="9" y="8" width="1" height="1" fill="#ff8ba7" />
      {/* Body */}
      <rect x="4" y="11" width="8" height="4" fill="#1a1a2e" />
      {/* Tail */}
      <rect x="12" y="12" width="3" height="1" fill="#1a1a2e" />
      <rect x="14" y="11" width="1" height="1" fill="#1a1a2e" />
    </svg>
  );
}

export function PixelBunny({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={PIXEL_STYLE}>
      {/* Ears — tall with pink inside */}
      <rect x="4" y="0" width="2" height="5" fill="#fff5e6" />
      <rect x="10" y="0" width="2" height="5" fill="#fff5e6" />
      <rect x="5" y="1" width="1" height="3" fill="#ffb7c5" />
      <rect x="10" y="1" width="1" height="3" fill="#ffb7c5" />
      {/* Head */}
      <rect x="3" y="4" width="10" height="8" fill="#fff5e6" />
      {/* Eyes — Miffy-style dots */}
      <rect x="5" y="6" width="2" height="2" fill="#1a1a2e" />
      <rect x="9" y="6" width="2" height="2" fill="#1a1a2e" />
      {/* X mouth — Miffy signature */}
      <rect x="7" y="8" width="2" height="1" fill="#1a1a2e" />
      <rect x="7" y="9" width="1" height="1" fill="#1a1a2e" />
      <rect x="8" y="9" width="1" height="1" fill="#1a1a2e" />
      {/* Body */}
      <rect x="4" y="12" width="8" height="4" fill="#fff5e6" />
    </svg>
  );
}

export function PixelHeart({ size = 16, color = "#ff4d6d" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 7" style={PIXEL_STYLE}>
      <rect x="1" y="0" width="2" height="1" fill={color} />
      <rect x="5" y="0" width="2" height="1" fill={color} />
      <rect x="0" y="1" width="4" height="1" fill={color} />
      <rect x="4" y="1" width="4" height="1" fill={color} />
      <rect x="0" y="2" width="8" height="1" fill={color} />
      <rect x="1" y="3" width="6" height="1" fill={color} />
      <rect x="2" y="4" width="4" height="1" fill={color} />
      <rect x="3" y="5" width="2" height="1" fill={color} />
    </svg>
  );
}

export function PixelChip({ size = 16, color = "#ffd93d" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={PIXEL_STYLE}>
      <rect x="3" y="0" width="4" height="1" fill={color} />
      <rect x="1" y="1" width="8" height="1" fill={color} />
      <rect x="0" y="2" width="10" height="6" fill={color} />
      <rect x="2" y="3" width="6" height="4" fill="#0a0a1a" />
      <rect x="3" y="4" width="4" height="2" fill={color} />
      <rect x="1" y="8" width="8" height="1" fill={color} />
      <rect x="3" y="9" width="4" height="1" fill={color} />
    </svg>
  );
}
