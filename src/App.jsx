// ─────────────────────────────────────────────
// ALL IN ♠ — Main Game Component
//
// Screens: Title → Lobby → Play → Showdown → Results → Game Over
// Uses Firebase Realtime Database for syncing between 2 players
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { saveGame, loadGame, onGameChange } from "./firebase.js";
import { QUESTIONS, SIDE_BETS, SABOTAGE_CARDS, STARTING_CHIPS, createFreshGame, shuffle } from "./gameData.js";
import { PixelCat, PixelBunny, PixelHeart, PixelChip } from "./PixelArt.jsx";
import * as S from "./styles.js";
import "./global.css";


// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function App() {
  // Which player am I? Persisted in localStorage so it survives refresh.
  const [myRole, setMyRoleState] = useState(() => {
    try { return localStorage.getItem("allin-my-role"); } catch { return null; }
  });

  function setMyRole(role) {
    setMyRoleState(role);
    try {
      if (role) localStorage.setItem("allin-my-role", role);
      else localStorage.removeItem("allin-my-role");
    } catch {}
  }

  // The shared game state (synced via Firebase)
  const [game, setGame] = useState(null);

  // Local UI state (not synced)
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("title");      // title | lobby | play | showdown | log
  const [showRules, setShowRules] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [sparkles, setSparkles] = useState([]);

  // Form data for current turn (local until submitted)
  const [form, setForm] = useState({
    answer: "",
    guess: "",
    wager: 10,
    moveType: "bet",
    sideBet: null,
    sabotage: null,
  });


  // ── Load game on mount ──

  useEffect(() => {
    async function init() {
      const saved = await loadGame();
      if (saved) {
        setGame(saved);
        // If we have a saved role and game is in progress, go to the right screen
        if (myRole && saved.players?.[myRole]?.joined) {
          if (saved.phase === "playing" && saved.round > 0) setScreen("play");
          else if (saved.phase === "showdown") { setScreen("showdown"); setRevealStep(0); }
          else if (saved.phase === "results") setScreen("play");
          else if (saved.phase === "gameover") setScreen("play");
          else if (saved.phase === "lobby") setScreen("lobby");
        }
      }
      setLoaded(true);
    }
    init();
  }, []);


  // ── Real-time sync with Firebase ──
  // Whenever the other player writes to Firebase, we see it instantly

  useEffect(() => {
    const unsubscribe = onGameChange((updatedGame) => {
      setGame(updatedGame);

      // Auto-navigate based on game phase changes
      if (!myRole) return;

      if (updatedGame.phase === "showdown") {
        setScreen("showdown");
        setRevealStep(0);
      } else if (updatedGame.phase === "playing" && updatedGame.round > 0) {
        // Game has started (both joined, or new round) — go to play screen
        setScreen((prev) => prev === "lobby" || prev === "title" ? "play" : prev);
      } else if (updatedGame.phase === "results") {
        setScreen("play"); // results screen is rendered inside the play route
      } else if (updatedGame.phase === "gameover") {
        setScreen("play");
      }
    });

    return () => unsubscribe();
  }, [myRole]);


  // ── Helpers ──

  const updateGame = useCallback(async (changes) => {
    // Build the new state from local game + changes
    // Then write the FULL state to Firebase (no merge ambiguity)
    const next = { ...game, ...changes };
    setGame(next);
    await saveGame(next);
  }, [game]);

  /** Write a complete game state directly — use when you need full control */
  async function writeFullState(fullState) {
    setGame(fullState);
    await saveGame(fullState);
  }

  function resetForm() {
    setForm({ answer: "", guess: "", wager: 10, moveType: "bet", sideBet: null, sabotage: null });
  }

  function triggerSparkles() {
    const newSparkles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      delay: Math.random() * 0.5,
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1600);
  }


  // ─────────────────────────────────────────────
  // GAME ACTIONS
  // ─────────────────────────────────────────────

  /** Player picks a slot (NYC or AMS) and enters their name */
  async function joinGame(role, name) {
    // CRITICAL: Read the LATEST state from Firebase, not stale local state.
    // Without this, Player 2 would overwrite Player 1's join.
    const freshGame = await loadGame() || createFreshGame();

    const updatedPlayers = {
      ...freshGame.players,
      [role]: { ...freshGame.players[role], name, joined: true },
    };

    const otherRole = role === "nyc" ? "ams" : "nyc";
    const bothJoined = updatedPlayers[otherRole].joined;

    const newState = {
      ...freshGame,
      players: updatedPlayers,
      phase: bothJoined ? "playing" : "lobby",
      round: bothJoined ? Math.max(1, freshGame.round) : 0,
      // Always clear turns on rejoin to prevent stale showdown data
      turns: { nyc: null, ams: null },
    };

    // If game was stuck in showdown, reset it to playing
    if (freshGame.phase === "showdown" && bothJoined) {
      newState.phase = "playing";
    }

    setMyRole(role);
    setGame(newState);
    await saveGame(newState);
    setScreen(bothJoined ? "play" : "lobby");
  }

  /** Submit your answer, guess, wager, and any special moves */
  async function submitTurn() {
    if (!form.answer.trim() || !form.guess.trim()) return;

    // Read fresh state so we can see if partner already submitted
    const current = await loadGame() || game;

    const wager = Math.min(form.wager, current.players[myRole].chips);
    const isDoubled = current.doubleActive || form.sabotage === "double";

    const turnData = {
      answer: form.answer,
      guess: form.guess,
      wager: isDoubled ? wager * 2 : wager,
      moveType: form.moveType,
      sideBet: form.sideBet,
      sabotage: form.sabotage,
    };

    // Remove used sabotage card
    let newSabotageCards = { ...current.sabotageCards };
    if (form.sabotage && newSabotageCards[myRole]) {
      newSabotageCards[myRole] = newSabotageCards[myRole].filter(
        (s) => s !== form.sabotage
      );
    }

    const currentTurns = current.turns || { nyc: null, ams: null };
    const newTurns = { ...currentTurns, [myRole]: turnData };
    const partner = myRole === "nyc" ? "ams" : "nyc";
    const bothDone = newTurns[partner] !== null;

    const nextState = {
      ...current,
      turns: newTurns,
      sabotageCards: newSabotageCards,
      doubleActive: form.sabotage === "double" || current.doubleActive,
      phase: bothDone ? "showdown" : "playing",
    };

    await writeFullState(nextState);
    resetForm();

    if (bothDone) {
      setScreen("showdown");
      setRevealStep(0);
    }
  }

  /** Calculate chips after showdown reveals */
  async function resolveShowdown() {
    // Read the absolute latest from Firebase
    const current = await loadGame() || game;
    const { turns, players, round } = current;
    const history = current.history || [];

    // If either turn is missing or empty, skip this round
    const nycValid = turns?.nyc?.answer;
    const amsValid = turns?.ams?.answer;

    if (!nycValid || !amsValid) {
      const skipRecord = {
        round,
        question: QUESTIONS[round - 1],
        nyc: turns?.nyc || { answer: "(skipped)", guess: "", wager: 0, moveType: "bet", sideBet: null, sabotage: null },
        ams: turns?.ams || { answer: "(skipped)", guess: "", wager: 0, moveType: "bet", sideBet: null, sabotage: null },
        chipsAfter: { nyc: players.nyc.chips, ams: players.ams.chips },
        skipped: true,
      };

      const nextState = {
        ...current,
        history: [...history, skipRecord],
        phase: round >= 30 ? "gameover" : "results",
        turns: { nyc: null, ams: null },
      };

      await writeFullState(nextState);
      triggerSparkles();
      setScreen("play");
      return;
    }

    let nycChips = players.nyc.chips;
    let amsChips = players.ams.chips;

    nycChips -= turns.nyc.wager;
    amsChips -= turns.ams.wager;
    nycChips += turns.nyc.wager + 5;
    amsChips += turns.ams.wager + 5;

    if (turns.nyc.moveType === "steal") { nycChips += 10; amsChips -= 5; }
    if (turns.ams.moveType === "steal") { amsChips += 10; nycChips -= 5; }
    if (turns.nyc.sideBet) nycChips += 3;
    if (turns.ams.sideBet) amsChips += 3;

    nycChips = Math.max(0, nycChips);
    amsChips = Math.max(0, amsChips);

    const roundRecord = {
      round,
      question: QUESTIONS[round - 1],
      nyc: turns.nyc,
      ams: turns.ams,
      chipsAfter: { nyc: nycChips, ams: amsChips },
    };

    const nextState = {
      ...current,
      players: {
        nyc: { ...players.nyc, chips: nycChips },
        ams: { ...players.ams, chips: amsChips },
      },
      history: [...history, roundRecord],
      phase: round >= 30 ? "gameover" : "results",
      turns: { nyc: null, ams: null },
    };

    await writeFullState(nextState);
    triggerSparkles();
  }

    triggerSparkles();
  }

  /** Move to the next round */
  async function nextRound() {
    const current = await loadGame() || game;
    const nextState = {
      ...current,
      round: current.round + 1,
      phase: "playing",
      turns: { nyc: null, ams: null },
      doubleActive: false,
    };
    await writeFullState(nextState);
    resetForm();
    setScreen("play");
  }

  /** Reset everything */
  async function resetGame() {
    const fresh = createFreshGame();
    setGame(fresh);
    await saveGame(fresh);
    setMyRole(null);
    resetForm();
    setScreen("title");
  }


  // ─────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────

  if (!loaded) {
    return (
      <div style={S.screen}>
        <div style={S.center}>
          <PixelHeart size={24} />
          <p style={{ ...S.pixel, fontSize: 12, marginTop: 12 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Derived state for convenience
  const question = game?.round > 0 && game?.round <= 30 ? QUESTIONS[game.round - 1] : null;
  const myPlayer = myRole ? game?.players?.[myRole] : null;
  const partnerRole = myRole === "nyc" ? "ams" : "nyc";
  const partnerPlayer = myRole ? game?.players?.[partnerRole] : null;
  const myTurnDone = game?.turns?.[myRole] !== null;
  const partnerTurnDone = game?.turns?.[partnerRole] !== null;


  // ═════════════════════════════════════════════
  //  SCREEN: TITLE
  // ═════════════════════════════════════════════

  if (screen === "title") {
    return (
      <div style={S.screen}>
        <div style={S.scanlines} />

        <div style={S.center}>
          <div style={S.titleCharacters}>
            <div style={{ ...S.characterCol, animation: "float 3s ease-in-out infinite" }}>
              <PixelBunny size={64} />
              <span style={{ ...S.pixel, fontSize: 10, color: "#ffb7c5", marginTop: 6 }}>NYC</span>
            </div>
            <div style={{ animation: "pulse 2s ease-in-out infinite", margin: "0 8px" }}>
              <span style={{ fontSize: 36, color: "#ff4d6d" }}>♠</span>
            </div>
            <div style={{ ...S.characterCol, animation: "float 3s ease-in-out infinite 0.5s" }}>
              <PixelCat size={64} />
              <span style={{ ...S.pixel, fontSize: 10, color: "#a8e6cf", marginTop: 6 }}>AMS</span>
            </div>
          </div>

          <h1 style={S.mainTitle}>ALL IN</h1>

          <div style={S.taglineRow}>
            <PixelHeart size={10} />
            <span style={{ ...S.pixel, fontSize: 9, color: "#ff4d6d" }}>a love poker game</span>
            <PixelHeart size={10} />
          </div>

          <p style={{ ...S.pixel, fontSize: 8, color: "#555", marginTop: 6 }}>
            30 rounds · bluff · steal · fall deeper
          </p>

          <div style={S.titleButtonStack}>
            <button style={S.primaryButton} onClick={() => setScreen("lobby")}>
              ♠ DEAL ME IN
            </button>

            {game?.phase && game.phase !== "lobby" && myRole && (
              <button
                style={S.darkButton}
                onClick={() => {
                  if (game.phase === "showdown") { setScreen("showdown"); setRevealStep(0); }
                  else setScreen("play");
                }}
              >
                ↻ CONTINUE GAME
              </button>
            )}

            <button style={S.ghostButton} onClick={() => setShowRules(true)}>
              ? HOW TO PLAY
            </button>
          </div>
        </div>

        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </div>
    );
  }


  // ═════════════════════════════════════════════
  //  SCREEN: LOBBY
  // ═════════════════════════════════════════════

  if (screen === "lobby") {
    return (
      <LobbyScreen
        game={game}
        myRole={myRole}
        onJoin={joinGame}
        onBack={() => setScreen("title")}
        onReset={resetGame}
      />
    );
  }


  // ═════════════════════════════════════════════
  //  SCREEN: SHOWDOWN
  // ═════════════════════════════════════════════

  if (screen === "showdown" && game?.phase === "showdown") {
    const turns = game.turns;

    return (
      <div style={S.screen}>
        <div style={S.scanlines} />
        <SparkleOverlay sparkles={sparkles} />

        <div style={S.contentWrap}>
          <ScoreHeader game={game} highlightRole={myRole} />

          <h2 style={{ ...S.pixel, fontSize: 18, color: "#ffd93d", textAlign: "center", marginBottom: 6 }}>
            SHOWDOWN
          </h2>
          <p style={{ ...S.pixel, fontSize: 9, color: "#666", textAlign: "center", marginBottom: 20, lineHeight: 2 }}>
            Round {game.round}: {question?.q}
          </p>

          {revealStep >= 1 && (
            <RevealCard label={`${game.players.nyc.name}'s Answer`} text={turns.nyc?.answer}
              color="#ffb7c5" icon={<PixelBunny size={22} />} />
          )}
          {revealStep >= 2 && (
            <RevealCard label={`${game.players.ams.name}'s Answer`} text={turns.ams?.answer}
              color="#a8e6cf" icon={<PixelCat size={22} />} />
          )}
          {revealStep >= 3 && (
            <RevealCard label={`${game.players.nyc.name} guessed`} text={turns.nyc?.guess}
              color="#ffb7c5" icon={<span style={{ fontSize: 16 }}>🔮</span>}
              subtitle={`about ${game.players.ams.name}`} />
          )}
          {revealStep >= 4 && (
            <RevealCard label={`${game.players.ams.name} guessed`} text={turns.ams?.guess}
              color="#a8e6cf" icon={<span style={{ fontSize: 16 }}>🔮</span>}
              subtitle={`about ${game.players.nyc.name}`} />
          )}
          {revealStep >= 5 && (
            <div style={{ ...S.revealBox, borderColor: "#ffd93d", animation: "slideUp 0.3s ease-out" }}>
              <p style={{ ...S.pixel, fontSize: 10, color: "#ffd93d", marginBottom: 12 }}>BETS & PLAYS</p>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <BetColumn name={game.players.nyc.name} turn={turns.nyc} color="#ffb7c5" />
                <span style={{ ...S.pixel, fontSize: 16, color: "#2a2a4a", alignSelf: "center" }}>vs</span>
                <BetColumn name={game.players.ams.name} turn={turns.ams} color="#a8e6cf" />
              </div>
            </div>
          )}

          <button
            style={{ ...S.primaryButton, marginTop: 20 }}
            onClick={() => {
              if (revealStep < 5) { setRevealStep((s) => s + 1); triggerSparkles(); }
              else resolveShowdown();
            }}
          >
            {revealStep === 0 ? "START REVEAL ♠"
              : revealStep < 4 ? "REVEAL NEXT ♠"
              : revealStep < 5 ? "SHOW THE BETS ♠"
              : "SETTLE THE SCORE ♠"}
          </button>

          {/* Emergency skip if showdown data is corrupted */}
          {(!turns?.nyc?.answer || !turns?.ams?.answer) && (
            <button
              style={{ ...S.ghostButton, marginTop: 12, width: "100%", fontSize: 8 }}
              onClick={resolveShowdown}
            >
              ⚠ Missing answers — skip this round
            </button>
          )}
        </div>
      </div>
    );
  }


  // ═════════════════════════════════════════════
  //  SCREEN: GAME LOG
  // ═════════════════════════════════════════════

  if (screen === "log") {
    return (
      <div style={S.screen}>
        <div style={S.scanlines} />
        <div style={S.contentWrap}>
          <h2 style={{ ...S.pixel, fontSize: 16, color: "#c4b5fd", marginBottom: 20 }}>📖 OUR STORY</h2>

          {(!game?.history || game.history.length === 0) ? (
            <p style={{ ...S.pixel, fontSize: 10, color: "#444", textAlign: "center" }}>No rounds played yet!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
              {game.history.map((entry, i) => (
                <div key={i} style={S.logEntry}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ ...S.pixel, fontSize: 9, color: "#ffd93d" }}>Round {entry.round}</span>
                    <span style={{ ...S.pixel, fontSize: 8, color: "#555" }}>{entry.question.cat}</span>
                  </div>
                  <p style={{ ...S.pixel, fontSize: 9, color: "#888", lineHeight: 2, marginBottom: 10 }}>{entry.question.q}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...S.pixel, fontSize: 8, color: "#ffb7c5" }}>{game.players.nyc.name}:</span>
                      <p style={S.logAnswer}>"{entry.nyc.answer}"</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...S.pixel, fontSize: 8, color: "#a8e6cf" }}>{game.players.ams.name}:</span>
                      <p style={S.logAnswer}>"{entry.ams.answer}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button style={{ ...S.darkButton, marginTop: 20 }} onClick={() => setScreen("play")}>
            ← BACK TO GAME
          </button>
        </div>
      </div>
    );
  }


  // ═════════════════════════════════════════════
  //  SCREEN: PLAY (main game board)
  // ═════════════════════════════════════════════

  // Edge: no game or no role
  if (!game || !myRole) {
    return (
      <div style={S.screen}>
        <div style={S.center}>
          <p style={{ ...S.pixel, fontSize: 11, color: "#fff" }}>No game found!</p>
          <button style={{ ...S.primaryButton, marginTop: 16 }} onClick={() => setScreen("lobby")}>
            JOIN A GAME
          </button>
        </div>
      </div>
    );
  }

  // Game over
  if (game.phase === "gameover") {
    const winner =
      game.players.nyc.chips > game.players.ams.chips ? "nyc" :
      game.players.ams.chips > game.players.nyc.chips ? "ams" : "tie";

    return (
      <div style={S.screen}>
        <div style={S.scanlines} />
        <SparkleOverlay sparkles={sparkles} />
        <div style={S.center}>
          <h1 style={{ ...S.pixel, fontSize: 24, color: "#ffd93d", marginBottom: 12 }}>GAME OVER</h1>
          <div style={{ display: "flex", gap: 24, margin: "20px 0" }}>
            <PixelBunny size={52} />
            <PixelHeart size={32} />
            <PixelCat size={52} />
          </div>
          <p style={{ ...S.pixel, fontSize: 14, color: "#fff", marginBottom: 20 }}>
            {winner === "tie" ? "IT'S A TIE!" : `${game.players[winner].name} WINS!`}
          </p>
          <div style={S.chipComparison}>
            <ChipDisplay name={game.players.nyc.name} chips={game.players.nyc.chips}
              color="#ffb7c5" icon={<PixelBunny size={36} />} />
            <span style={{ ...S.pixel, fontSize: 14, color: "#333" }}>vs</span>
            <ChipDisplay name={game.players.ams.name} chips={game.players.ams.chips}
              color="#a8e6cf" icon={<PixelCat size={36} />} />
          </div>
          <p style={{ ...S.pixel, fontSize: 9, color: "#c4b5fd", lineHeight: 2.4, textAlign: "center", marginTop: 20 }}>
            30 rounds of bluffing, stealing,<br />and falling deeper in love. ♥
          </p>
          <button style={{ ...S.primaryButton, marginTop: 24 }} onClick={resetGame}>PLAY AGAIN ♠</button>
        </div>
      </div>
    );
  }

  // Between rounds — results
  if (game.phase === "results") {
    return (
      <div style={S.screen}>
        <div style={S.scanlines} />
        <SparkleOverlay sparkles={sparkles} />
        <div style={{ ...S.contentWrap, alignItems: "center" }}>
          <h2 style={{ ...S.pixel, fontSize: 16, color: "#ffd93d", textAlign: "center", marginBottom: 20 }}>
            ROUND {game.round} COMPLETE
          </h2>
          <div style={S.chipComparison}>
            <ChipDisplay name={game.players.nyc.name} chips={game.players.nyc.chips}
              color="#ffb7c5" icon={<PixelBunny size={36} />} />
            <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}><PixelHeart size={28} /></div>
            <ChipDisplay name={game.players.ams.name} chips={game.players.ams.chips}
              color="#a8e6cf" icon={<PixelCat size={36} />} />
          </div>
          <ProgressBar current={game.round} total={30} />
          <button style={{ ...S.primaryButton, marginTop: 24 }} onClick={nextRound}>NEXT ROUND ♠</button>
          <BottomNav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
        </div>
      </div>
    );
  }

  // Redirect to showdown if both done
  if (game.phase === "showdown" && screen !== "showdown") {
    setScreen("showdown");
    setRevealStep(0);
    return null;
  }

  // Waiting for partner
  if (myTurnDone && !partnerTurnDone) {
    return (
      <div style={S.screen}>
        <div style={S.scanlines} />
        <div style={S.center}>
          <div style={{ animation: "float 3s ease-in-out infinite" }}>
            {partnerRole === "ams" ? <PixelCat size={64} /> : <PixelBunny size={64} />}
          </div>
          <h2 style={{ ...S.pixel, fontSize: 14, color: "#fff", marginTop: 16, marginBottom: 8 }}>
            Waiting for {partnerPlayer?.name || "partner"}...
          </h2>
          <p style={{ ...S.pixel, fontSize: 9, color: "#666", lineHeight: 2, textAlign: "center", maxWidth: 280 }}>
            Your turn is locked in! They'll see it as soon as they open the game.
          </p>
          <p style={{ ...S.pixel, fontSize: 8, color: "#333", marginTop: 16 }}>
            ✓ Live syncing via Firebase
          </p>
          <BottomNav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
        </div>
      </div>
    );
  }

  // ── MY TURN — The actual game board ──

  const mySabotages = game.sabotageCards[myRole] || [];
  const sideBetOptions = shuffle(SIDE_BETS).slice(0, 4);

  return (
    <div style={S.screen}>
      <div style={S.scanlines} />

      <div style={S.contentWrap}>
        <ScoreHeader game={game} highlightRole={myRole} />

        {/* Turn banner */}
        <div style={S.turnBanner}>
          {myRole === "nyc" ? <PixelBunny size={32} /> : <PixelCat size={32} />}
          <div>
            <span style={{ ...S.pixel, fontSize: 12, color: "#fff" }}>{myPlayer.name}'s Turn</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666" }}>
              {myRole === "nyc" ? "🗽 New York" : "🚲 Amsterdam"}
            </span>
          </div>
        </div>

        {/* Question */}
        <div style={S.questionCard}>
          <div style={S.categoryBadge}>
            <span style={{ ...S.pixel, fontSize: 9 }}>{question.cat}</span>
          </div>
          <p style={S.questionText}>{question.q}</p>
          <div style={S.difficultyRow}>
            {[1, 2, 3].map((d) => (
              <div key={d} style={{ width: 10, height: 10, background: d <= question.diff ? "#ff4d6d" : "#1a1a2e" }} />
            ))}
            <span style={{ ...S.pixel, fontSize: 7, color: "#444", marginLeft: 8 }}>difficulty</span>
          </div>
        </div>

        {/* Answer */}
        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#a8e6cf" }}>YOUR HONEST ANSWER:</label>
          <textarea style={S.textarea} value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            placeholder="Answer from the heart..." rows={3} />
        </div>

        {/* Guess */}
        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffb7c5" }}>
            GUESS {partnerPlayer?.name?.toUpperCase() || "PARTNER"}'S ANSWER:
          </label>
          <textarea style={S.textarea} value={form.guess}
            onChange={(e) => setForm((f) => ({ ...f, guess: e.target.value }))}
            placeholder={`What will ${partnerPlayer?.name || "they"} say?`} rows={2} />
        </div>

        {/* Play style */}
        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffd93d", marginBottom: 10 }}>PLAY STYLE:</label>
          <div style={S.twoColumnRow}>
            <button
              style={{ ...S.optionCard,
                borderColor: form.moveType === "bet" ? "#ffd93d" : "#1a1a2e",
                background: form.moveType === "bet" ? "rgba(255,217,61,0.08)" : "transparent",
              }}
              onClick={() => setForm((f) => ({ ...f, moveType: "bet" }))}
            >
              <PixelChip size={18} />
              <span style={{ ...S.pixel, fontSize: 10, color: "#fff", marginTop: 6 }}>BET</span>
              <span style={{ ...S.pixel, fontSize: 7, color: "#666", marginTop: 2 }}>Standard play</span>
            </button>
            <button
              style={{ ...S.optionCard,
                borderColor: form.moveType === "steal" ? "#ff4d6d" : "#1a1a2e",
                background: form.moveType === "steal" ? "rgba(255,77,109,0.08)" : "transparent",
              }}
              onClick={() => setForm((f) => ({ ...f, moveType: "steal" }))}
            >
              <span style={{ fontSize: 18 }}>🃏</span>
              <span style={{ ...S.pixel, fontSize: 10, color: "#fff", marginTop: 6 }}>STEAL</span>
              <span style={{ ...S.pixel, fontSize: 7, color: "#ff4d6d", marginTop: 2 }}>Win big or lose big</span>
            </button>
          </div>
        </div>

        {/* Sabotage */}
        {mySabotages.length > 0 && (
          <div style={S.fieldGroup}>
            <label style={{ ...S.pixel, fontSize: 9, color: "#c4b5fd", marginBottom: 10 }}>
              SABOTAGE CARDS ({mySabotages.length} remaining):
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {mySabotages.map((key) => (
                <button key={key}
                  style={{ ...S.sabotageCard,
                    borderColor: form.sabotage === key ? "#c4b5fd" : "#1a1a2e",
                    background: form.sabotage === key ? "rgba(196,181,253,0.1)" : "transparent",
                  }}
                  onClick={() => setForm((f) => ({ ...f, sabotage: f.sabotage === key ? null : key }))}
                >
                  <span style={{ fontSize: 20 }}>{SABOTAGE_CARDS[key].icon}</span>
                  <span style={{ ...S.pixel, fontSize: 7, marginTop: 4 }}>{SABOTAGE_CARDS[key].name}</span>
                </button>
              ))}
            </div>
            {form.sabotage && (
              <p style={{ ...S.pixel, fontSize: 8, color: "#c4b5fd", marginTop: 8, lineHeight: 1.8 }}>
                {SABOTAGE_CARDS[form.sabotage].desc}
              </p>
            )}
          </div>
        )}

        {/* Wager */}
        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffd93d" }}>
            WAGER: {form.wager} chips{game.doubleActive ? " (DOUBLED ⚡)" : ""}
          </label>
          <input type="range" min={5} max={Math.min(50, myPlayer.chips)} step={5}
            value={form.wager} onChange={(e) => setForm((f) => ({ ...f, wager: +e.target.value }))}
            style={{ width: "100%", marginTop: 10 }} />
          <div style={S.sliderLabels}>
            <span style={{ ...S.pixel, fontSize: 7, color: "#555" }}>safe</span>
            <span style={{ ...S.pixel, fontSize: 7, color: "#ff4d6d" }}>risky</span>
          </div>
        </div>

        {/* Side bet */}
        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#7fdbca", marginBottom: 10 }}>
            SIDE BET — predict partner's behavior (+3 chips):
          </label>
          <div style={S.twoColumnGrid}>
            {sideBetOptions.map((bet, i) => (
              <button key={i}
                style={{ ...S.sideBetOption,
                  borderColor: form.sideBet === bet ? "#7fdbca" : "#1a1a2e",
                  background: form.sideBet === bet ? "rgba(127,219,202,0.08)" : "transparent",
                }}
                onClick={() => setForm((f) => ({ ...f, sideBet: f.sideBet === bet ? null : bet }))}
              >
                <span style={{ ...S.pixel, fontSize: 8, color: "#ccc", lineHeight: 1.8 }}>{bet}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          style={{ ...S.primaryButton, marginTop: 20, opacity: form.answer.trim() && form.guess.trim() ? 1 : 0.4 }}
          onClick={submitTurn}
          disabled={!form.answer.trim() || !form.guess.trim()}
        >
          ♠ LOCK IN MY TURN
        </button>

        <BottomNav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
      </div>
    </div>
  );


// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function LobbyScreen({ game, myRole, onJoin, onBack, onReset }) {
  const [name, setName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  const currentGame = game || createFreshGame();
  const nycTaken = currentGame.players.nyc.joined;
  const amsTaken = currentGame.players.ams.joined;
  const bothTaken = nycTaken && amsTaken;

  // If both slots are taken, allow "rejoin" — click your name to reclaim your role
  function handleSlotClick(role) {
    const taken = role === "nyc" ? nycTaken : amsTaken;
    if (!taken) {
      // Open slot — select it normally
      setSelectedSlot(role);
    } else if (bothTaken) {
      // Both taken — allow rejoin by clicking your own slot
      setSelectedSlot(role);
      setName(currentGame.players[role].name);
    }
  }

  function handleJoin() {
    if (!selectedSlot || !name.trim()) return;
    onJoin(selectedSlot, name.trim());
  }

  return (
    <div style={S.screen}>
      <div style={S.scanlines} />
      <div style={{ ...S.center, maxWidth: 360, width: "100%", padding: "0 16px" }}>
        <h2 style={{ ...S.pixel, fontSize: 16, color: "#ff4d6d", marginBottom: 8 }}>PICK YOUR SIDE</h2>
        <p style={{ ...S.pixel, fontSize: 8, color: "#666", marginBottom: 24, lineHeight: 2, textAlign: "center" }}>
          {bothTaken
            ? "Both players joined! Tap your name to rejoin."
            : <>One player picks NYC, the other picks AMS.<br />Share the URL with your partner!</>}
        </p>

        {/* NYC slot */}
        <button
          style={{ ...S.lobbySlot,
            borderColor: selectedSlot === "nyc" ? "#ffb7c5" : "#1a1a2e",
            opacity: nycTaken && !bothTaken ? 0.5 : 1,
            background: selectedSlot === "nyc" ? "rgba(255,183,197,0.08)" : "transparent",
          }}
          onClick={() => handleSlotClick("nyc")}
          disabled={nycTaken && !bothTaken}
        >
          <PixelBunny size={52} />
          <div style={{ marginLeft: 16, flex: 1 }}>
            <span style={{ ...S.pixel, fontSize: 11, color: "#ffb7c5" }}>NYC — Bunny</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666", marginTop: 4 }}>
              {nycTaken ? `✓ ${currentGame.players.nyc.name} joined` : "Open slot"}
            </span>
          </div>
          {selectedSlot === "nyc" && bothTaken && (
            <span style={{ ...S.pixel, fontSize: 7, color: "#ffb7c5" }}>← That's me!</span>
          )}
        </button>

        <div style={{ margin: "12px 0", textAlign: "center" }}><PixelHeart size={20} /></div>

        {/* AMS slot */}
        <button
          style={{ ...S.lobbySlot,
            borderColor: selectedSlot === "ams" ? "#a8e6cf" : "#1a1a2e",
            opacity: amsTaken && !bothTaken ? 0.5 : 1,
            background: selectedSlot === "ams" ? "rgba(168,230,207,0.08)" : "transparent",
          }}
          onClick={() => handleSlotClick("ams")}
          disabled={amsTaken && !bothTaken}
        >
          <PixelCat size={52} />
          <div style={{ marginLeft: 16, flex: 1 }}>
            <span style={{ ...S.pixel, fontSize: 11, color: "#a8e6cf" }}>AMS — Black Cat</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666", marginTop: 4 }}>
              {amsTaken ? `✓ ${currentGame.players.ams.name} joined` : "Open slot"}
            </span>
          </div>
          {selectedSlot === "ams" && bothTaken && (
            <span style={{ ...S.pixel, fontSize: 7, color: "#a8e6cf" }}>← That's me!</span>
          )}
        </button>

        {/* Name input — show for new joins, pre-fill for rejoins */}
        {selectedSlot && !bothTaken && (
          <div style={{ marginTop: 20, width: "100%", animation: "slideUp 0.3s ease-out" }}>
            <label style={{ ...S.pixel, fontSize: 9, color: "#fff", marginBottom: 8 }}>YOUR NAME:</label>
            <input style={S.textInput} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name" maxLength={12} autoFocus />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 20, width: "100%" }}>
          <button style={S.ghostButton} onClick={onBack}>←</button>

          {selectedSlot ? (
            <button
              style={{ ...S.primaryButton, flex: 1, opacity: (bothTaken || name.trim()) ? 1 : 0.4 }}
              onClick={handleJoin}
              disabled={!bothTaken && !name.trim()}
            >
              {bothTaken ? `REJOIN AS ${selectedSlot.toUpperCase()} ♠` : `JOIN AS ${selectedSlot.toUpperCase()} ♠`}
            </button>
          ) : (
            <button style={{ ...S.darkButton, flex: 1 }} disabled>
              Tap your name above!
            </button>
          )}
        </div>

        {/* Reset option */}
        <button
          style={{ ...S.ghostButton, marginTop: 16, width: "100%", fontSize: 8, color: "#444" }}
          onClick={() => {
            if (window.confirm("Reset the whole game? Both players will need to rejoin.")) {
              onReset();
            }
          }}
        >
          🔄 RESET GAME (start over)
        </button>

        {myRole && !(nycTaken && amsTaken) && (
          <p style={{ ...S.pixel, fontSize: 8, color: "#666", marginTop: 16, lineHeight: 2, textAlign: "center" }}>
            Waiting for partner to join...<br />Send them the URL!
          </p>
        )}
      </div>
    </div>
  );
}

function ScoreHeader({ game, highlightRole }) {
  return (
    <div style={S.scoreHeader}>
      <div style={S.scoreHeaderPlayer}>
        <PixelBunny size={24} />
        <div>
          <p style={{ ...S.pixel, fontSize: 8, color: highlightRole === "nyc" ? "#ffb7c5" : "#555", margin: 0 }}>
            {game.players.nyc.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <PixelChip size={10} color={highlightRole === "nyc" ? "#ffd93d" : "#333"} />
            <span style={{ ...S.pixel, fontSize: 10, color: "#fff", margin: 0 }}>{game.players.nyc.chips}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ ...S.pixel, fontSize: 7, color: "#444" }}>RND</span>
        <span style={{ ...S.pixel, fontSize: 18, color: "#ffd93d" }}>{game.round}</span>
      </div>

      <div style={{ ...S.scoreHeaderPlayer, flexDirection: "row-reverse", textAlign: "right" }}>
        <PixelCat size={24} />
        <div>
          <p style={{ ...S.pixel, fontSize: 8, color: highlightRole === "ams" ? "#a8e6cf" : "#555", margin: 0 }}>
            {game.players.ams.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
            <PixelChip size={10} color={highlightRole === "ams" ? "#ffd93d" : "#333"} />
            <span style={{ ...S.pixel, fontSize: 10, color: "#fff", margin: 0 }}>{game.players.ams.chips}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevealCard({ label, text, color, icon, subtitle }) {
  return (
    <div style={{ ...S.revealBox, borderColor: color, animation: "slideUp 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {icon}
        <span style={{ ...S.pixel, fontSize: 9, color }}>{label}</span>
        {subtitle && <span style={{ ...S.pixel, fontSize: 7, color: "#444" }}>{subtitle}</span>}
      </div>
      <p style={S.revealText}>"{text}"</p>
    </div>
  );
}

function BetColumn({ name, turn, color }) {
  if (!turn) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ ...S.pixel, fontSize: 9, color }}>{name}</span>
      <span style={{ ...S.pixel, fontSize: 16, color: "#fff" }}>{turn.wager} 🪙</span>
      <span style={{ ...S.pixel, fontSize: 8, color: turn.moveType === "steal" ? "#ff4d6d" : "#666" }}>
        {turn.moveType === "steal" ? "STEAL!" : "BET"}
      </span>
      {turn.sabotage && (
        <span style={{ ...S.pixel, fontSize: 7, color: "#c4b5fd" }}>
          {SABOTAGE_CARDS[turn.sabotage]?.icon} {turn.sabotage}
        </span>
      )}
      {turn.sideBet && (
        <span style={{ ...S.pixel, fontSize: 7, color: "#7fdbca", textAlign: "center", maxWidth: 110 }}>
          Side: {turn.sideBet}
        </span>
      )}
    </div>
  );
}

function ChipDisplay({ name, chips, color, icon }) {
  return (
    <div style={S.chipBox}>
      {icon}
      <span style={{ ...S.pixel, fontSize: 10, color, marginTop: 8 }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <PixelChip size={16} />
        <span style={{ ...S.pixel, fontSize: 20, color: "#fff" }}>{chips}</span>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }) {
  return (
    <div style={{ marginTop: 20, width: "100%", textAlign: "center" }}>
      <div style={S.progressTrack}>
        <div style={{ ...S.progressFill, width: `${(current / total) * 100}%` }} />
      </div>
      <span style={{ ...S.pixel, fontSize: 8, color: "#555", marginTop: 6 }}>{current}/{total} rounds</span>
    </div>
  );
}

function BottomNav({ onHome, onLog, onReset }) {
  return (
    <div style={S.bottomNav}>
      <button style={S.navButton} onClick={onHome}>🏠</button>
      <button style={S.navButton} onClick={onLog}>📖</button>
      <button style={S.navButton} onClick={onReset}>🔄</button>
    </div>
  );
}

function RulesModal({ onClose }) {
  const rules = [
    ["♠", "Each round shows a question. Answer honestly AND guess what your partner will say."],
    ["🪙", "Set your wager. Higher bet = bigger reward (or loss)."],
    ["🃏", "STEAL: Take chips FROM their bank if you nail the guess. Wrong = lose double."],
    ["🔀", "SABOTAGE (3 per game): SWAP = harder Q, 2× STAKES, MIRROR = who knows who better."],
    ["🎲", "SIDE BETS: Predict partner's behavior for +3 bonus chips."],
    ["💀", "SHOWDOWN: Both submit, then reveal one by one for maximum drama."],
    ["🏆", "30 rounds. Most chips wins."],
    ["📱", "Share the URL! Each player picks a side, plays on their own time. Syncs live."],
  ];

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ ...S.pixel, fontSize: 16, color: "#ff4d6d", marginBottom: 16 }}>HOW TO PLAY</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
          {rules.map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{icon}</span>
              <p style={{ ...S.pixel, fontSize: 8, color: "#ccc", lineHeight: 2.2, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
        <button style={{ ...S.primaryButton, marginTop: 20 }} onClick={onClose}>LET'S GO ♠</button>
      </div>
    </div>
  );
}

function SparkleOverlay({ sparkles }) {
  return sparkles.map((s) => (
    <div key={s.id} style={{
      position: "fixed", top: `${s.y}%`, left: `${s.x}%`, zIndex: 50, pointerEvents: "none",
      animation: `sparkle 1s ease-out forwards`, animationDelay: `${s.delay}s`,
    }}>
      <PixelHeart size={10} color={["#ff4d6d", "#ffd93d", "#c4b5fd"][s.id % 3]} />
    </div>
  ));
}
