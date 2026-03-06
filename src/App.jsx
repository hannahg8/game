import { useState, useEffect, useCallback } from "react";
import { saveGame, loadGame, onGameChange } from "./firebase.js";
import { QUESTIONS, SIDE_BETS, SABOTAGE_CARDS, STARTING_CHIPS, createFreshGame, shuffle } from "./gameData.js";
import { PixelCat, PixelBunny, PixelHeart, PixelChip } from "./PixelArt.jsx";
import * as S from "./styles.js";
import "./global.css";

// ═══════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════

export default function App() {

  // ── State ──

  const [myRole, setMyRoleRaw] = useState(() => {
    try { return localStorage.getItem("allin-my-role"); } catch { return null; }
  });
  const [game, setGame] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("title");
  const [showRules, setShowRules] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [sparkles, setSparkles] = useState([]);
  const [form, setForm] = useState({
    answer: "", guess: "", wager: 10, moveType: "bet", sideBet: null, sabotage: null,
  });

  function setMyRole(role) {
    setMyRoleRaw(role);
    try {
      if (role) localStorage.setItem("allin-my-role", role);
      else localStorage.removeItem("allin-my-role");
    } catch {}
  }

  function resetForm() {
    setForm({ answer: "", guess: "", wager: 10, moveType: "bet", sideBet: null, sabotage: null });
  }

  function pop() {
    setSparkles(Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i, x: 10 + Math.random() * 80, y: 10 + Math.random() * 80, delay: Math.random() * 0.5,
    })));
    setTimeout(() => setSparkles([]), 1600);
  }

  // ── Load on mount ──

  useEffect(() => {
    (async () => {
      const saved = await loadGame();
      if (saved) {
        setGame(saved);
        if (myRole && saved.players?.[myRole]?.joined) {
          if (saved.phase === "showdown") { setScreen("showdown"); setRevealStep(0); }
          else if (saved.phase === "playing" && saved.round > 0) setScreen("play");
          else if (saved.phase === "results" || saved.phase === "gameover") setScreen("play");
          else if (saved.phase === "lobby") setScreen("lobby");
        }
      }
      setLoaded(true);
    })();
  }, []);

  // ── Real-time Firebase listener ──

  useEffect(() => {
    const unsub = onGameChange((g) => {
      setGame(g);
      if (!myRole) return;
      if (g.phase === "showdown") { setScreen("showdown"); setRevealStep(0); }
      else if (g.phase === "playing" && g.round > 0) {
        setScreen(prev => (prev === "lobby" || prev === "title") ? "play" : prev);
      }
      else if (g.phase === "results" || g.phase === "gameover") setScreen("play");
    });
    return () => unsub();
  }, [myRole]);


  // ── Core actions ──

  async function joinGame(role, name) {
    const fresh = await loadGame() || createFreshGame();
    const players = {
      ...fresh.players,
      [role]: { ...fresh.players[role], name, joined: true },
    };
    const other = role === "nyc" ? "ams" : "nyc";
    const both = players[other].joined;
    const next = {
      ...fresh,
      players,
      phase: both ? "playing" : "lobby",
      round: both ? Math.max(1, fresh.round) : 0,
      turns: { nyc: null, ams: null },
    };
    if (fresh.phase === "showdown" && both) next.phase = "playing";
    setMyRole(role);
    setGame(next);
    await saveGame(next);
    setScreen(both ? "play" : "lobby");
  }

  async function submitTurn() {
    if (!form.answer.trim() || !form.guess.trim()) return;
    const current = await loadGame() || game;
    const wager = Math.min(form.wager, current.players[myRole].chips);
    const dbl = current.doubleActive || form.sabotage === "double";
    const td = {
      answer: form.answer, guess: form.guess,
      wager: dbl ? wager * 2 : wager,
      moveType: form.moveType, sideBet: form.sideBet, sabotage: form.sabotage,
    };
    let sabs = { ...(current.sabotageCards || {}) };
    if (form.sabotage && sabs[myRole]) {
      sabs[myRole] = sabs[myRole].filter(s => s !== form.sabotage);
    }
    const turns = { ...(current.turns || { nyc: null, ams: null }), [myRole]: td };
    const partner = myRole === "nyc" ? "ams" : "nyc";
    const bothDone = turns[partner] !== null;
    const next = {
      ...current,
      turns, sabotageCards: sabs,
      doubleActive: form.sabotage === "double" || current.doubleActive,
      phase: bothDone ? "showdown" : "playing",
    };
    setGame(next);
    await saveGame(next);
    resetForm();
    if (bothDone) { setScreen("showdown"); setRevealStep(0); }
  }

  async function resolveShowdown() {
    const current = await loadGame() || game;
    const { turns, players, round } = current;
    const history = current.history || [];
    const nycOk = turns?.nyc?.answer;
    const amsOk = turns?.ams?.answer;

    if (!nycOk || !amsOk) {
      // Skip corrupted round
      const rec = {
        round, question: QUESTIONS[round - 1],
        nyc: turns?.nyc || { answer: "(skipped)", guess: "", wager: 0, moveType: "bet" },
        ams: turns?.ams || { answer: "(skipped)", guess: "", wager: 0, moveType: "bet" },
        chipsAfter: { nyc: players.nyc.chips, ams: players.ams.chips }, skipped: true,
      };
      const next = { ...current, history: [...history, rec], phase: round >= 30 ? "gameover" : "results", turns: { nyc: null, ams: null } };
      setGame(next); await saveGame(next); pop(); setScreen("play");
      return;
    }

    let nc = players.nyc.chips, ac = players.ams.chips;
    nc -= turns.nyc.wager; ac -= turns.ams.wager;
    nc += turns.nyc.wager + 5; ac += turns.ams.wager + 5;
    if (turns.nyc.moveType === "steal") { nc += 10; ac -= 5; }
    if (turns.ams.moveType === "steal") { ac += 10; nc -= 5; }
    if (turns.nyc.sideBet) nc += 3;
    if (turns.ams.sideBet) ac += 3;
    nc = Math.max(0, nc); ac = Math.max(0, ac);

    const rec = { round, question: QUESTIONS[round - 1], nyc: turns.nyc, ams: turns.ams, chipsAfter: { nyc: nc, ams: ac } };
    const next = {
      ...current,
      players: { nyc: { ...players.nyc, chips: nc }, ams: { ...players.ams, chips: ac } },
      history: [...history, rec],
      phase: round >= 30 ? "gameover" : "results",
      turns: { nyc: null, ams: null },
    };
    setGame(next); await saveGame(next); pop();
  }

  async function nextRound() {
    const current = await loadGame() || game;
    const next = { ...current, round: current.round + 1, phase: "playing", turns: { nyc: null, ams: null }, doubleActive: false };
    setGame(next); await saveGame(next); resetForm(); setScreen("play");
  }

  async function resetGame() {
    const fresh = createFreshGame();
    setGame(fresh); await saveGame(fresh); setMyRole(null); resetForm(); setScreen("title");
  }


  // ── Render helpers ──

  if (!loaded) return (
    <div style={S.screen}><div style={S.center}><PixelHeart size={24} /><p style={{ ...S.pixel, fontSize: 12, marginTop: 12 }}>Loading...</p></div></div>
  );

  const q = game?.round > 0 && game?.round <= 30 ? QUESTIONS[game.round - 1] : null;
  const me = myRole ? game?.players?.[myRole] : null;
  const partnerRole = myRole === "nyc" ? "ams" : "nyc";
  const partner = myRole ? game?.players?.[partnerRole] : null;
  const myDone = game?.turns?.[myRole] !== null && game?.turns?.[myRole] !== undefined;
  const partnerDone = game?.turns?.[partnerRole] !== null && game?.turns?.[partnerRole] !== undefined;


  // ═══════════════════════════════════
  // TITLE
  // ═══════════════════════════════════

  if (screen === "title") return (
    <div style={S.screen}><div style={S.scanlines} />
      <div style={S.center}>
        <div style={S.titleCharacters}>
          <div style={{ ...S.characterCol, animation: "float 3s ease-in-out infinite" }}><PixelBunny size={64} /><span style={{ ...S.pixel, fontSize: 10, color: "#ffb7c5", marginTop: 6 }}>NYC</span></div>
          <div style={{ animation: "pulse 2s ease-in-out infinite", margin: "0 8px" }}><span style={{ fontSize: 36, color: "#ff4d6d" }}>♠</span></div>
          <div style={{ ...S.characterCol, animation: "float 3s ease-in-out infinite 0.5s" }}><PixelCat size={64} /><span style={{ ...S.pixel, fontSize: 10, color: "#a8e6cf", marginTop: 6 }}>AMS</span></div>
        </div>
        <h1 style={S.mainTitle}>ALL IN</h1>
        <div style={S.taglineRow}><PixelHeart size={10} /><span style={{ ...S.pixel, fontSize: 9, color: "#ff4d6d" }}>a love poker game</span><PixelHeart size={10} /></div>
        <p style={{ ...S.pixel, fontSize: 8, color: "#555", marginTop: 6 }}>30 rounds · bluff · steal · fall deeper</p>
        <div style={S.titleButtonStack}>
          <button style={S.primaryButton} onClick={() => setScreen("lobby")}>♠ DEAL ME IN</button>
          {game?.phase && game.phase !== "lobby" && myRole && (
            <button style={S.darkButton} onClick={() => { if (game.phase === "showdown") { setScreen("showdown"); setRevealStep(0); } else setScreen("play"); }}>↻ CONTINUE GAME</button>
          )}
          <button style={S.ghostButton} onClick={() => setShowRules(true)}>? HOW TO PLAY</button>
        </div>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );


  // ═══════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════

  if (screen === "lobby") return (
    <LobbyScreen game={game} myRole={myRole} onJoin={joinGame} onBack={() => setScreen("title")} onReset={resetGame} />
  );


  // ═══════════════════════════════════
  // SHOWDOWN
  // ═══════════════════════════════════

  if (screen === "showdown" && game?.phase === "showdown") {
    const t = game.turns || {};
    return (
      <div style={S.screen}><div style={S.scanlines} /><Sparks list={sparkles} />
        <div style={S.contentWrap}>
          <Hdr game={game} hl={myRole} />
          <h2 style={{ ...S.pixel, fontSize: 18, color: "#ffd93d", textAlign: "center", marginBottom: 6 }}>SHOWDOWN</h2>
          <p style={{ ...S.pixel, fontSize: 9, color: "#666", textAlign: "center", marginBottom: 20, lineHeight: 2 }}>Round {game.round}: {q?.q}</p>

          {revealStep >= 1 && <Reveal label={`${game.players.nyc.name}'s Answer`} text={t.nyc?.answer || "(no answer)"} color="#ffb7c5" icon={<PixelBunny size={22} />} />}
          {revealStep >= 2 && <Reveal label={`${game.players.ams.name}'s Answer`} text={t.ams?.answer || "(no answer)"} color="#a8e6cf" icon={<PixelCat size={22} />} />}
          {revealStep >= 3 && <Reveal label={`${game.players.nyc.name} guessed`} text={t.nyc?.guess || "(no guess)"} color="#ffb7c5" icon={<span style={{ fontSize: 16 }}>🔮</span>} sub={`about ${game.players.ams.name}`} />}
          {revealStep >= 4 && <Reveal label={`${game.players.ams.name} guessed`} text={t.ams?.guess || "(no guess)"} color="#a8e6cf" icon={<span style={{ fontSize: 16 }}>🔮</span>} sub={`about ${game.players.nyc.name}`} />}
          {revealStep >= 5 && (
            <div style={{ ...S.revealBox, borderColor: "#ffd93d", animation: "slideUp .3s ease-out" }}>
              <p style={{ ...S.pixel, fontSize: 10, color: "#ffd93d", marginBottom: 12 }}>BETS & PLAYS</p>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <BetCol name={game.players.nyc.name} turn={t.nyc} color="#ffb7c5" />
                <span style={{ ...S.pixel, fontSize: 16, color: "#2a2a4a", alignSelf: "center" }}>vs</span>
                <BetCol name={game.players.ams.name} turn={t.ams} color="#a8e6cf" />
              </div>
            </div>
          )}

          <button style={{ ...S.primaryButton, marginTop: 20 }} onClick={() => {
            if (revealStep < 5) { setRevealStep(s => s + 1); pop(); }
            else resolveShowdown();
          }}>
            {revealStep === 0 ? "START REVEAL ♠" : revealStep < 4 ? "REVEAL NEXT ♠" : revealStep < 5 ? "SHOW THE BETS ♠" : "SETTLE THE SCORE ♠"}
          </button>

          {(!t.nyc?.answer || !t.ams?.answer) && (
            <button style={{ ...S.ghostButton, marginTop: 12, width: "100%", fontSize: 8 }} onClick={resolveShowdown}>
              ⚠ Missing answers — skip this round
            </button>
          )}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════
  // GAME LOG
  // ═══════════════════════════════════

  if (screen === "log") return (
    <div style={S.screen}><div style={S.scanlines} />
      <div style={S.contentWrap}>
        <h2 style={{ ...S.pixel, fontSize: 16, color: "#c4b5fd", marginBottom: 20 }}>📖 OUR STORY</h2>
        {(!game?.history || game.history.length === 0)
          ? <p style={{ ...S.pixel, fontSize: 10, color: "#444", textAlign: "center" }}>No rounds played yet!</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
              {(game.history || []).map((e, i) => (
                <div key={i} style={S.logEntry}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ ...S.pixel, fontSize: 9, color: "#ffd93d" }}>Round {e.round}</span>
                    <span style={{ ...S.pixel, fontSize: 8, color: "#555" }}>{e.question?.cat}</span>
                  </div>
                  <p style={{ ...S.pixel, fontSize: 9, color: "#888", lineHeight: 2, marginBottom: 10 }}>{e.question?.q}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}><span style={{ ...S.pixel, fontSize: 8, color: "#ffb7c5" }}>{game.players.nyc.name}:</span><p style={S.logAnswer}>"{e.nyc?.answer}"</p></div>
                    <div style={{ flex: 1 }}><span style={{ ...S.pixel, fontSize: 8, color: "#a8e6cf" }}>{game.players.ams.name}:</span><p style={S.logAnswer}>"{e.ams?.answer}"</p></div>
                  </div>
                </div>
              ))}
            </div>
        }
        <button style={{ ...S.darkButton, marginTop: 20 }} onClick={() => setScreen("play")}>← BACK TO GAME</button>
      </div>
    </div>
  );


  // ═══════════════════════════════════
  // PLAY SCREEN (main board + sub-states)
  // ═══════════════════════════════════

  if (!game || !myRole) return (
    <div style={S.screen}><div style={S.center}>
      <p style={{ ...S.pixel, fontSize: 11, color: "#fff" }}>No game found!</p>
      <button style={{ ...S.primaryButton, marginTop: 16 }} onClick={() => setScreen("lobby")}>JOIN A GAME</button>
    </div></div>
  );

  // Game over
  if (game.phase === "gameover") {
    const w = game.players.nyc.chips > game.players.ams.chips ? "nyc" : game.players.ams.chips > game.players.nyc.chips ? "ams" : "tie";
    return (
      <div style={S.screen}><div style={S.scanlines} /><Sparks list={sparkles} />
        <div style={S.center}>
          <h1 style={{ ...S.pixel, fontSize: 24, color: "#ffd93d", marginBottom: 12 }}>GAME OVER</h1>
          <div style={{ display: "flex", gap: 24, margin: "20px 0" }}><PixelBunny size={52} /><PixelHeart size={32} /><PixelCat size={52} /></div>
          <p style={{ ...S.pixel, fontSize: 14, color: "#fff", marginBottom: 20 }}>{w === "tie" ? "IT'S A TIE!" : `${game.players[w].name} WINS!`}</p>
          <div style={S.chipComparison}>
            <Chips name={game.players.nyc.name} chips={game.players.nyc.chips} color="#ffb7c5" icon={<PixelBunny size={36} />} />
            <span style={{ ...S.pixel, fontSize: 14, color: "#333" }}>vs</span>
            <Chips name={game.players.ams.name} chips={game.players.ams.chips} color="#a8e6cf" icon={<PixelCat size={36} />} />
          </div>
          <p style={{ ...S.pixel, fontSize: 9, color: "#c4b5fd", lineHeight: 2.4, textAlign: "center", marginTop: 20 }}>30 rounds of bluffing, stealing,<br />and falling deeper in love. ♥</p>
          <button style={{ ...S.primaryButton, marginTop: 24 }} onClick={resetGame}>PLAY AGAIN ♠</button>
        </div>
      </div>
    );
  }

  // Results between rounds
  if (game.phase === "results") return (
    <div style={S.screen}><div style={S.scanlines} /><Sparks list={sparkles} />
      <div style={{ ...S.contentWrap, alignItems: "center" }}>
        <h2 style={{ ...S.pixel, fontSize: 16, color: "#ffd93d", textAlign: "center", marginBottom: 20 }}>ROUND {game.round} COMPLETE</h2>
        <div style={S.chipComparison}>
          <Chips name={game.players.nyc.name} chips={game.players.nyc.chips} color="#ffb7c5" icon={<PixelBunny size={36} />} />
          <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}><PixelHeart size={28} /></div>
          <Chips name={game.players.ams.name} chips={game.players.ams.chips} color="#a8e6cf" icon={<PixelCat size={36} />} />
        </div>
        <Prog current={game.round} total={30} />
        <button style={{ ...S.primaryButton, marginTop: 24 }} onClick={nextRound}>NEXT ROUND ♠</button>
        <Nav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
      </div>
    </div>
  );

  // Redirect showdown
  if (game.phase === "showdown" && screen !== "showdown") {
    setScreen("showdown"); setRevealStep(0); return null;
  }

  // Waiting for partner
  if (myDone && !partnerDone) return (
    <div style={S.screen}><div style={S.scanlines} />
      <div style={S.center}>
        <div style={{ animation: "float 3s ease-in-out infinite" }}>
          {partnerRole === "ams" ? <PixelCat size={64} /> : <PixelBunny size={64} />}
        </div>
        <h2 style={{ ...S.pixel, fontSize: 14, color: "#fff", marginTop: 16, marginBottom: 8 }}>Waiting for {partner?.name || "partner"}...</h2>
        <p style={{ ...S.pixel, fontSize: 9, color: "#666", lineHeight: 2, textAlign: "center", maxWidth: 280 }}>Your turn is locked in! They'll see it when they open the game.</p>
        <p style={{ ...S.pixel, fontSize: 8, color: "#333", marginTop: 16 }}>✓ Live syncing via Firebase</p>
        <Nav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
      </div>
    </div>
  );

  // ── MY TURN ──

  const mySabs = game.sabotageCards?.[myRole] || [];
  const sideOpts = shuffle(SIDE_BETS).slice(0, 4);

  return (
    <div style={S.screen}><div style={S.scanlines} />
      <div style={S.contentWrap}>
        <Hdr game={game} hl={myRole} />

        <div style={S.turnBanner}>
          {myRole === "nyc" ? <PixelBunny size={32} /> : <PixelCat size={32} />}
          <div>
            <span style={{ ...S.pixel, fontSize: 12, color: "#fff" }}>{me.name}'s Turn</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666" }}>{myRole === "nyc" ? "🗽 New York" : "🚲 Amsterdam"}</span>
          </div>
        </div>

        <div style={S.questionCard}>
          <div style={S.categoryBadge}><span style={{ ...S.pixel, fontSize: 9 }}>{q.cat}</span></div>
          <p style={S.questionText}>{q.q}</p>
          <div style={S.difficultyRow}>
            {[1, 2, 3].map(d => <div key={d} style={{ width: 10, height: 10, background: d <= q.diff ? "#ff4d6d" : "#1a1a2e" }} />)}
            <span style={{ ...S.pixel, fontSize: 7, color: "#444", marginLeft: 8 }}>difficulty</span>
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#a8e6cf" }}>YOUR HONEST ANSWER:</label>
          <textarea style={S.textarea} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Answer from the heart..." rows={3} />
        </div>

        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffb7c5" }}>GUESS {partner?.name?.toUpperCase() || "PARTNER"}'S ANSWER:</label>
          <textarea style={S.textarea} value={form.guess} onChange={e => setForm(f => ({ ...f, guess: e.target.value }))} placeholder={`What will ${partner?.name || "they"} say?`} rows={2} />
        </div>

        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffd93d", marginBottom: 10 }}>PLAY STYLE:</label>
          <div style={S.twoColumnRow}>
            <button style={{ ...S.optionCard, borderColor: form.moveType === "bet" ? "#ffd93d" : "#1a1a2e", background: form.moveType === "bet" ? "rgba(255,217,61,0.08)" : "transparent" }} onClick={() => setForm(f => ({ ...f, moveType: "bet" }))}>
              <PixelChip size={18} /><span style={{ ...S.pixel, fontSize: 10, color: "#fff", marginTop: 6 }}>BET</span><span style={{ ...S.pixel, fontSize: 7, color: "#666", marginTop: 2 }}>Standard play</span>
            </button>
            <button style={{ ...S.optionCard, borderColor: form.moveType === "steal" ? "#ff4d6d" : "#1a1a2e", background: form.moveType === "steal" ? "rgba(255,77,109,0.08)" : "transparent" }} onClick={() => setForm(f => ({ ...f, moveType: "steal" }))}>
              <span style={{ fontSize: 18 }}>🃏</span><span style={{ ...S.pixel, fontSize: 10, color: "#fff", marginTop: 6 }}>STEAL</span><span style={{ ...S.pixel, fontSize: 7, color: "#ff4d6d", marginTop: 2 }}>Win big or lose big</span>
            </button>
          </div>
        </div>

        {mySabs.length > 0 && (
          <div style={S.fieldGroup}>
            <label style={{ ...S.pixel, fontSize: 9, color: "#c4b5fd", marginBottom: 10 }}>SABOTAGE CARDS ({mySabs.length} remaining):</label>
            <div style={{ display: "flex", gap: 8 }}>
              {mySabs.map(k => (
                <button key={k} style={{ ...S.sabotageCard, borderColor: form.sabotage === k ? "#c4b5fd" : "#1a1a2e", background: form.sabotage === k ? "rgba(196,181,253,0.1)" : "transparent" }} onClick={() => setForm(f => ({ ...f, sabotage: f.sabotage === k ? null : k }))}>
                  <span style={{ fontSize: 20 }}>{SABOTAGE_CARDS[k].icon}</span><span style={{ ...S.pixel, fontSize: 7, marginTop: 4 }}>{SABOTAGE_CARDS[k].name}</span>
                </button>
              ))}
            </div>
            {form.sabotage && <p style={{ ...S.pixel, fontSize: 8, color: "#c4b5fd", marginTop: 8, lineHeight: 1.8 }}>{SABOTAGE_CARDS[form.sabotage].desc}</p>}
          </div>
        )}

        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#ffd93d" }}>WAGER: {form.wager} chips{game.doubleActive ? " (DOUBLED ⚡)" : ""}</label>
          <input type="range" min={5} max={Math.min(50, me?.chips || 50)} step={5} value={form.wager} onChange={e => setForm(f => ({ ...f, wager: +e.target.value }))} style={{ width: "100%", marginTop: 10 }} />
          <div style={S.sliderLabels}><span style={{ ...S.pixel, fontSize: 7, color: "#555" }}>safe</span><span style={{ ...S.pixel, fontSize: 7, color: "#ff4d6d" }}>risky</span></div>
        </div>

        <div style={S.fieldGroup}>
          <label style={{ ...S.pixel, fontSize: 9, color: "#7fdbca", marginBottom: 10 }}>SIDE BET — predict partner's behavior (+3 chips):</label>
          <div style={S.twoColumnGrid}>
            {sideOpts.map((b, i) => (
              <button key={i} style={{ ...S.sideBetOption, borderColor: form.sideBet === b ? "#7fdbca" : "#1a1a2e", background: form.sideBet === b ? "rgba(127,219,202,0.08)" : "transparent" }} onClick={() => setForm(f => ({ ...f, sideBet: f.sideBet === b ? null : b }))}>
                <span style={{ ...S.pixel, fontSize: 8, color: "#ccc", lineHeight: 1.8 }}>{b}</span>
              </button>
            ))}
          </div>
        </div>

        <button style={{ ...S.primaryButton, marginTop: 20, opacity: form.answer.trim() && form.guess.trim() ? 1 : 0.4 }} onClick={submitTurn} disabled={!form.answer.trim() || !form.guess.trim()}>
          ♠ LOCK IN MY TURN
        </button>

        <Nav onHome={() => setScreen("title")} onLog={() => setScreen("log")} onReset={resetGame} />
      </div>
    </div>
  );
}


// ═══════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════

function LobbyScreen({ game, myRole, onJoin, onBack, onReset }) {
  const [name, setName] = useState("");
  const [slot, setSlot] = useState(null);
  const g = game || createFreshGame();
  const nycTaken = g.players.nyc.joined;
  const amsTaken = g.players.ams.joined;
  const both = nycTaken && amsTaken;

  function pick(role) {
    if (both) { setSlot(role); setName(g.players[role].name); }
    else if (role === "nyc" && !nycTaken) setSlot(role);
    else if (role === "ams" && !amsTaken) setSlot(role);
  }

  return (
    <div style={S.screen}><div style={S.scanlines} />
      <div style={{ ...S.center, maxWidth: 360, width: "100%", padding: "0 16px" }}>
        <h2 style={{ ...S.pixel, fontSize: 16, color: "#ff4d6d", marginBottom: 8 }}>PICK YOUR SIDE</h2>
        <p style={{ ...S.pixel, fontSize: 8, color: "#666", marginBottom: 24, lineHeight: 2, textAlign: "center" }}>
          {both ? "Both players joined! Tap your name to rejoin." : <>One player picks NYC, the other AMS.<br />Share the URL with your partner!</>}
        </p>

        <button style={{ ...S.lobbySlot, borderColor: slot === "nyc" ? "#ffb7c5" : "#1a1a2e", opacity: nycTaken && !both ? 0.5 : 1, background: slot === "nyc" ? "rgba(255,183,197,0.08)" : "transparent" }} onClick={() => pick("nyc")} disabled={nycTaken && !both}>
          <PixelBunny size={52} />
          <div style={{ marginLeft: 16, flex: 1 }}>
            <span style={{ ...S.pixel, fontSize: 11, color: "#ffb7c5" }}>NYC — Bunny</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666", marginTop: 4 }}>{nycTaken ? `✓ ${g.players.nyc.name} joined` : "Open slot"}</span>
          </div>
          {slot === "nyc" && both && <span style={{ ...S.pixel, fontSize: 7, color: "#ffb7c5" }}>← Me!</span>}
        </button>

        <div style={{ margin: "12px 0", textAlign: "center" }}><PixelHeart size={20} /></div>

        <button style={{ ...S.lobbySlot, borderColor: slot === "ams" ? "#a8e6cf" : "#1a1a2e", opacity: amsTaken && !both ? 0.5 : 1, background: slot === "ams" ? "rgba(168,230,207,0.08)" : "transparent" }} onClick={() => pick("ams")} disabled={amsTaken && !both}>
          <PixelCat size={52} />
          <div style={{ marginLeft: 16, flex: 1 }}>
            <span style={{ ...S.pixel, fontSize: 11, color: "#a8e6cf" }}>AMS — Black Cat</span>
            <span style={{ ...S.pixel, fontSize: 8, color: "#666", marginTop: 4 }}>{amsTaken ? `✓ ${g.players.ams.name} joined` : "Open slot"}</span>
          </div>
          {slot === "ams" && both && <span style={{ ...S.pixel, fontSize: 7, color: "#a8e6cf" }}>← Me!</span>}
        </button>

        {slot && !both && (
          <div style={{ marginTop: 20, width: "100%", animation: "slideUp 0.3s ease-out" }}>
            <label style={{ ...S.pixel, fontSize: 9, color: "#fff", marginBottom: 8 }}>YOUR NAME:</label>
            <input style={S.textInput} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={12} autoFocus />
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20, width: "100%" }}>
          <button style={S.ghostButton} onClick={onBack}>←</button>
          {slot ? (
            <button style={{ ...S.primaryButton, flex: 1, opacity: (both || name.trim()) ? 1 : 0.4 }} onClick={() => (both || name.trim()) && onJoin(slot, both ? g.players[slot].name : name.trim())} disabled={!both && !name.trim()}>
              {both ? `REJOIN AS ${slot.toUpperCase()} ♠` : `JOIN AS ${slot.toUpperCase()} ♠`}
            </button>
          ) : (
            <button style={{ ...S.darkButton, flex: 1 }} disabled>Tap a slot above!</button>
          )}
        </div>

        <button style={{ ...S.ghostButton, marginTop: 16, width: "100%", fontSize: 8, color: "#444" }} onClick={() => { if (window.confirm("Reset the whole game?")) onReset(); }}>
          🔄 RESET GAME
        </button>
      </div>
    </div>
  );
}

function Hdr({ game, hl }) {
  return (
    <div style={S.scoreHeader}>
      <div style={S.scoreHeaderPlayer}>
        <PixelBunny size={24} />
        <div>
          <p style={{ ...S.pixel, fontSize: 8, color: hl === "nyc" ? "#ffb7c5" : "#555", margin: 0 }}>{game.players.nyc.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><PixelChip size={10} color={hl === "nyc" ? "#ffd93d" : "#333"} /><span style={{ ...S.pixel, fontSize: 10, color: "#fff", margin: 0 }}>{game.players.nyc.chips}</span></div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ ...S.pixel, fontSize: 7, color: "#444" }}>RND</span>
        <span style={{ ...S.pixel, fontSize: 18, color: "#ffd93d" }}>{game.round}</span>
      </div>
      <div style={{ ...S.scoreHeaderPlayer, flexDirection: "row-reverse", textAlign: "right" }}>
        <PixelCat size={24} />
        <div>
          <p style={{ ...S.pixel, fontSize: 8, color: hl === "ams" ? "#a8e6cf" : "#555", margin: 0 }}>{game.players.ams.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}><PixelChip size={10} color={hl === "ams" ? "#ffd93d" : "#333"} /><span style={{ ...S.pixel, fontSize: 10, color: "#fff", margin: 0 }}>{game.players.ams.chips}</span></div>
        </div>
      </div>
    </div>
  );
}

function Reveal({ label, text, color, icon, sub }) {
  return (
    <div style={{ ...S.revealBox, borderColor: color, animation: "slideUp .3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {icon}<span style={{ ...S.pixel, fontSize: 9, color }}>{label}</span>
        {sub && <span style={{ ...S.pixel, fontSize: 7, color: "#444" }}>{sub}</span>}
      </div>
      <p style={S.revealText}>"{text}"</p>
    </div>
  );
}

function BetCol({ name, turn, color }) {
  if (!turn) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><span style={{ ...S.pixel, fontSize: 9, color }}>{ name}</span><span style={{ ...S.pixel, fontSize: 8, color: "#444" }}>No data</span></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ ...S.pixel, fontSize: 9, color }}>{name}</span>
      <span style={{ ...S.pixel, fontSize: 16, color: "#fff" }}>{turn.wager || 0} 🪙</span>
      <span style={{ ...S.pixel, fontSize: 8, color: turn.moveType === "steal" ? "#ff4d6d" : "#666" }}>{turn.moveType === "steal" ? "STEAL!" : "BET"}</span>
      {turn.sabotage && <span style={{ ...S.pixel, fontSize: 7, color: "#c4b5fd" }}>{SABOTAGE_CARDS[turn.sabotage]?.icon} {turn.sabotage}</span>}
      {turn.sideBet && <span style={{ ...S.pixel, fontSize: 7, color: "#7fdbca", textAlign: "center", maxWidth: 110 }}>Side: {turn.sideBet}</span>}
    </div>
  );
}

function Chips({ name, chips, color, icon }) {
  return (
    <div style={S.chipBox}>{icon}<span style={{ ...S.pixel, fontSize: 10, color, marginTop: 8 }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><PixelChip size={16} /><span style={{ ...S.pixel, fontSize: 20, color: "#fff" }}>{chips}</span></div>
    </div>
  );
}

function Prog({ current, total }) {
  return (
    <div style={{ marginTop: 20, width: "100%", textAlign: "center" }}>
      <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${(current / total) * 100}%` }} /></div>
      <span style={{ ...S.pixel, fontSize: 8, color: "#555", marginTop: 6 }}>{current}/{total} rounds</span>
    </div>
  );
}

function Nav({ onHome, onLog, onReset }) {
  return (
    <div style={S.bottomNav}>
      <button style={S.navButton} onClick={onHome}>🏠</button>
      <button style={S.navButton} onClick={onLog}>📖</button>
      <button style={S.navButton} onClick={onReset}>🔄</button>
    </div>
  );
}

function RulesModal({ onClose }) {
  const r = [
    ["♠", "Each round: answer honestly AND guess your partner's answer."],
    ["🪙", "Set your wager. Higher bet = bigger reward or loss."],
    ["🃏", "STEAL: Take chips FROM their bank. Wrong = lose double."],
    ["🔀", "SABOTAGE (3 per game): SWAP, 2× STAKES, or MIRROR."],
    ["🎲", "SIDE BETS: Predict partner's behavior for +3 chips."],
    ["💀", "SHOWDOWN: Both submit, then reveal one by one."],
    ["🏆", "30 rounds. Most chips wins."],
    ["📱", "Share the URL! Pick a side, play on your own time."],
  ];
  return (
    <div style={S.modalOverlay} onClick={onClose}><div style={S.modalContent} onClick={e => e.stopPropagation()}>
      <h2 style={{ ...S.pixel, fontSize: 16, color: "#ff4d6d", marginBottom: 16 }}>HOW TO PLAY</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
        {r.map(([ic, tx], i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{ic}</span><p style={{ ...S.pixel, fontSize: 8, color: "#ccc", lineHeight: 2.2, margin: 0 }}>{tx}</p></div>)}
      </div>
      <button style={{ ...S.primaryButton, marginTop: 20 }} onClick={onClose}>LET'S GO ♠</button>
    </div></div>
  );
}

function Sparks({ list }) {
  return (list || []).map(s => (
    <div key={s.id} style={{ position: "fixed", top: `${s.y}%`, left: `${s.x}%`, zIndex: 50, pointerEvents: "none", animation: `sparkle 1s ease-out forwards`, animationDelay: `${s.delay}s` }}>
      <PixelHeart size={10} color={["#ff4d6d", "#ffd93d", "#c4b5fd"][s.id % 3]} />
    </div>
  ));
}
