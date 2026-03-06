// ─────────────────────────────────────────────
// GAME CONTENT
// All the questions, cards, and constants
// ─────────────────────────────────────────────

export const STARTING_CHIPS = 100;

export const QUESTIONS = [
  { id: 1,  cat: "🔥 Hot Take",  q: "What's a popular movie everyone loves that you think is overrated?", diff: 1 },
  { id: 2,  cat: "🪞 Mirror",    q: "What do you think your partner's comfort food is?", diff: 1 },
  { id: 3,  cat: "💭 Deep",      q: "What's something you pretend to like but secretly don't?", diff: 2 },
  { id: 4,  cat: "⚡ Quick",     q: "Beach vacation or city trip — and why?", diff: 1 },
  { id: 5,  cat: "🔥 Hot Take",  q: "What habit of your partner's would you change if you could?", diff: 2 },
  { id: 6,  cat: "💭 Deep",      q: "What were you most insecure about as a teenager?", diff: 3 },
  { id: 7,  cat: "🪞 Mirror",    q: "What do you think your partner is most proud of?", diff: 2 },
  { id: 8,  cat: "⚡ Quick",     q: "Morning person or night owl — do you wish you were the other?", diff: 1 },
  { id: 9,  cat: "🔥 Hot Take",  q: "NYC or Amsterdam — which has better food? Defend your answer.", diff: 2 },
  { id: 10, cat: "💭 Deep",      q: "What's a lie you told that you still feel guilty about?", diff: 3 },
  { id: 11, cat: "⚡ Quick",     q: "What would your partner order at a restaurant you've never been to?", diff: 2 },
  { id: 12, cat: "🔥 Hot Take",  q: "What's the most overrated thing about being in a relationship?", diff: 2 },
  { id: 13, cat: "🪞 Mirror",    q: "What do you think keeps your partner up at night?", diff: 3 },
  { id: 14, cat: "💭 Deep",      q: "Describe our relationship to a stranger in one sentence.", diff: 2 },
  { id: 15, cat: "⚡ Quick",     q: "Your partner gets a face tattoo. What is it?", diff: 1 },
  { id: 16, cat: "🔥 Hot Take",  q: "What's a dealbreaker most people would judge you for?", diff: 3 },
  { id: 17, cat: "💭 Deep",      q: "When did you last feel truly lonely — even with people around?", diff: 3 },
  { id: 18, cat: "🪞 Mirror",    q: "What song is stuck in your partner's head right now?", diff: 1 },
  { id: 19, cat: "⚡ Quick",     q: "Game show: what category does your partner dominate?", diff: 1 },
  { id: 20, cat: "🔥 Hot Take",  q: "Long distance makes relationships stronger — agree or disagree?", diff: 2 },
  { id: 21, cat: "💭 Deep",      q: "What's the scariest thing about being really known by someone?", diff: 3 },
  { id: 22, cat: "🪞 Mirror",    q: "What does your partner need to hear from you more often?", diff: 3 },
  { id: 23, cat: "🔥 Hot Take",  q: "What are you better at than your partner — and you know it?", diff: 2 },
  { id: 24, cat: "⚡ Quick",     q: "Partner's phone dies. One last text to you. What does it say?", diff: 2 },
  { id: 25, cat: "💭 Deep",      q: "What part of yourself did you unlearn to be in this relationship?", diff: 3 },
  { id: 26, cat: "🪞 Mirror",    q: "What's your partner's biggest unadmitted dream?", diff: 3 },
  { id: 27, cat: "🔥 Hot Take",  q: "If we broke up — what would you miss most? What would you NOT?", diff: 3 },
  { id: 28, cat: "⚡ Quick",     q: "Build your partner's perfect day, hour by hour.", diff: 2 },
  { id: 29, cat: "💭 Deep",      q: "What's something you've forgiven but haven't forgotten?", diff: 3 },
  { id: 30, cat: "🪞 Mirror",    q: "Write the first line of your partner's autobiography.", diff: 2 },
];

export const SIDE_BETS = [
  "They'll mention food",
  "They'll use an emoji or !",
  "Answer will be 3+ sentences",
  "They'll mention us/me",
  "They'll be brutally honest",
  "They'll try to be funny",
  "They'll reference a memory",
  "They'll dodge the question",
];

export const SABOTAGE_CARDS = {
  swap:   { name: "SWAP",      icon: "🔀", desc: "Partner gets a harder category next round" },
  double: { name: "2× STAKES", icon: "⚡", desc: "Double ALL stakes this round for both players" },
  mirror: { name: "MIRROR",    icon: "🪞", desc: "Both answer the same Q about each other — who knows who?" },
};

/**
 * Create a brand new game state
 */
export function createFreshGame() {
  return {
    phase: "lobby",
    round: 0,
    players: {
      nyc: { name: "", chips: STARTING_CHIPS, joined: false },
      ams: { name: "", chips: STARTING_CHIPS, joined: false },
    },
    turns: { nyc: null, ams: null },
    sabotageCards: {
      nyc: ["swap", "double", "mirror"],
      ams: ["swap", "double", "mirror"],
    },
    doubleActive: false,
    history: [],
  };
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
