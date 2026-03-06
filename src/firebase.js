// ─────────────────────────────────────────────
// FIREBASE CONFIG
// Replace the values below with YOUR Firebase config
// from Step 1 of the setup guide (SETUP.md)
// ─────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBUyp4RpKLK6aOXwB8FncS2on-p-oQvoRc",
  authDomain: "game-e90b7.firebaseapp.com",
  databaseURL: "https://game-e90b7-default-rtdb.firebaseio.com",
  projectId: "game-e90b7",
  storageBucket: "game-e90b7.firebasestorage.app",
  messagingSenderId: "80723378311",
  appId: "1:80723378311:web:399dd72bedc50804ae7822",
  measurementId: "G-BX8PHXM05C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ─────────────────────────────────────────────
// DATABASE HELPERS
// These replace the Claude artifact storage API
// with Firebase Realtime Database
// ─────────────────────────────────────────────

const GAME_ID = "main"; // Single shared game

/**
 * Save the full game state to Firebase
 */
export async function saveGame(gameState) {
  try {
    await set(ref(db, `games/${GAME_ID}`), gameState);
  } catch (error) {
    console.error("Failed to save game:", error);
  }
}

/**
 * Load the game state once from Firebase
 */
export async function loadGame() {
  try {
    const snapshot = await get(ref(db, `games/${GAME_ID}`));
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.error("Failed to load game:", error);
  }
  return null;
}

/**
 * Listen to real-time changes in the game state.
 * Calls the callback whenever the other player makes a move.
 * Returns an unsubscribe function.
 */
export function onGameChange(callback) {
  const gameRef = ref(db, `games/${GAME_ID}`);
  const unsubscribe = onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
  return unsubscribe;
}
