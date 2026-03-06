// ─────────────────────────────────────────────
// STYLES
// All styles organized by component/section
// ─────────────────────────────────────────────

const FONT = "'Press Start 2P', monospace";

// Shared text style base
export const pixel = {
  fontFamily: FONT,
  letterSpacing: "0.5px",
  lineHeight: 1.6,
  display: "block",
  margin: 0,
};

// ── Layout ──

export const screen = {
  width: "100%",
  minHeight: "100vh",
  background: "linear-gradient(180deg, #080812 0%, #0f0f24 40%, #0a0a18 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  position: "relative",
  overflow: "hidden",
  padding: "20px 16px",
  fontFamily: FONT,
};

export const scanlines = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 100,
  background:
    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
};

export const center = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  zIndex: 2,
};

export const contentWrap = {
  width: "100%",
  maxWidth: 420,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
};

// ── Buttons ──

export const primaryButton = {
  fontFamily: FONT,
  fontSize: 11,
  background: "linear-gradient(180deg, #ff4d6d, #d42f52)",
  color: "#fff",
  border: "3px solid #ff8fa8",
  borderBottom: "4px solid #a01a3a",
  borderRight: "4px solid #a01a3a",
  padding: "16px 24px",
  cursor: "pointer",
  textAlign: "center",
  width: "100%",
  transition: "transform 0.1s",
};

export const darkButton = {
  fontFamily: FONT,
  fontSize: 10,
  background: "#151528",
  color: "#c4b5fd",
  border: "3px solid #2a2a4a",
  borderBottom: "4px solid #0a0a1a",
  padding: "14px 20px",
  cursor: "pointer",
  textAlign: "center",
  width: "100%",
};

export const ghostButton = {
  fontFamily: FONT,
  fontSize: 9,
  background: "transparent",
  color: "#555",
  border: "2px solid #2a2a4a",
  padding: "12px 16px",
  cursor: "pointer",
};

// ── Title Screen ──

export const titleCharacters = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 24,
};

export const characterCol = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

export const mainTitle = {
  fontFamily: FONT,
  fontSize: 36,
  color: "#fff",
  textShadow: "2px 2px 0 #ff4d6d, 4px 4px 0 #1a0a2e",
  margin: "0 0 8px",
  letterSpacing: 8,
};

export const taglineRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const titleButtonStack = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "100%",
  maxWidth: 280,
  marginTop: 32,
};

// ── Lobby ──

export const lobbySlot = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: 16,
  background: "transparent",
  border: "2px solid #1a1a2e",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s",
};

// ── Score Header ──

export const scoreHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 0 12px",
  borderBottom: "2px solid #1a1a2e",
  marginBottom: 16,
};

export const scoreHeaderPlayer = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
};

// ── Turn Banner ──

export const turnBanner = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  justifyContent: "center",
  padding: "12px 0",
  marginBottom: 12,
};

// ── Question Card ──

export const questionCard = {
  background: "rgba(255,77,109,0.05)",
  border: "2px solid #2a1a2e",
  padding: 20,
  marginBottom: 20,
};

export const categoryBadge = {
  background: "#1a1a2e",
  display: "inline-block",
  padding: "6px 10px",
  marginBottom: 8,
};

export const questionText = {
  fontFamily: FONT,
  fontSize: 12,
  color: "#fff",
  lineHeight: 2.4,
  margin: "12px 0 0",
  letterSpacing: "0.5px",
};

export const difficultyRow = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginTop: 12,
};

// ── Form Fields ──

export const fieldGroup = {
  marginBottom: 16,
};

export const textarea = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 14,
  background: "#0a0a12",
  color: "#fff",
  border: "2px solid #2a2a4a",
  padding: 14,
  width: "100%",
  resize: "vertical",
  lineHeight: 1.8,
  marginTop: 8,
  minHeight: 70,
  boxSizing: "border-box",
};

export const textInput = {
  fontFamily: FONT,
  fontSize: 12,
  background: "#0a0a12",
  color: "#fff",
  border: "2px solid #2a2a4a",
  padding: "12px 14px",
  width: "100%",
  textAlign: "center",
  marginTop: 8,
  boxSizing: "border-box",
};

// ── Move Type ──

export const twoColumnRow = {
  display: "flex",
  gap: 12,
};

export const optionCard = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 16,
  border: "2px solid #1a1a2e",
  cursor: "pointer",
  transition: "all 0.2s",
  background: "transparent",
};

// ── Sabotage ──

export const sabotageCard = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "12px 8px",
  border: "2px solid #1a1a2e",
  cursor: "pointer",
  background: "transparent",
  transition: "all 0.2s",
};

// ── Wager ──

export const sliderLabels = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
};

// ── Side Bets ──

export const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

export const sideBetOption = {
  padding: "10px 8px",
  border: "2px solid #1a1a2e",
  cursor: "pointer",
  textAlign: "left",
  background: "transparent",
  transition: "all 0.2s",
};

// ── Showdown ──

export const revealBox = {
  background: "rgba(255,255,255,0.03)",
  border: "2px solid",
  padding: 16,
  marginBottom: 12,
};

export const revealText = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 14,
  color: "#fff",
  lineHeight: 1.7,
  fontStyle: "italic",
  margin: 0,
};

// ── Chip Display ──

export const chipComparison = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
};

export const chipBox = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  background: "rgba(255,255,255,0.03)",
  border: "2px solid #1a1a2e",
  padding: "20px 28px",
};

// ── Progress Bar ──

export const progressTrack = {
  width: "100%",
  height: 8,
  background: "#0a0a12",
  border: "1px solid #1a1a2e",
  overflow: "hidden",
  marginBottom: 6,
};

export const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #ff4d6d, #ffd93d, #7fdbca, #c4b5fd)",
  transition: "width 0.5s ease",
};

// ── Navigation ──

export const bottomNav = {
  display: "flex",
  justifyContent: "center",
  gap: 16,
  marginTop: 24,
  padding: "14px 0",
  borderTop: "2px solid #1a1a2e",
};

export const navButton = {
  background: "transparent",
  border: "2px solid #1a1a2e",
  padding: "10px 18px",
  fontSize: 16,
  cursor: "pointer",
  borderRadius: 0,
};

// ── Game Log ──

export const logEntry = {
  background: "rgba(255,255,255,0.03)",
  border: "2px solid #1a1a2e",
  padding: 16,
};

export const logAnswer = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 12,
  color: "#e0d6f0",
  fontStyle: "italic",
  lineHeight: 1.7,
  margin: "6px 0 0",
};

// ── Modal ──

export const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
  padding: 20,
};

export const modalContent = {
  background: "#0f0f24",
  border: "3px solid #2a2a4a",
  padding: 24,
  maxWidth: 400,
  width: "100%",
  maxHeight: "85vh",
  overflow: "auto",
};
