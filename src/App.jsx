import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfigStatus } from "./firebase";
import AntMessage from "./AntMessage";

const ROOM_KEY = "ant-mail-room";
const NAME_KEY = "ant-mail-name";

function makeId() {
  return crypto.randomUUID().slice(0, 8);
}

export default function App() {
  const [room, setRoom] = useState(() => localStorage.getItem(ROOM_KEY) || "");
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(Boolean(localStorage.getItem(ROOM_KEY)));
  const [eatingId, setEatingId] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!joined || !room) return;

    if (firebaseConfigStatus === "missing-env") {
      setStatus("Missing Firebase env values. Add VITE_FIREBASE_* to .env.local and restart Vite.");
      return;
    }

    const q = query(
      collection(db, "rooms", room, "messages"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStatus("");
      },
      (error) => {
        console.error("Firestore listener error:", error?.code, error?.message, error);

        const message =
          error?.code === "permission-denied"
            ? "The ants couldn't reach their colony. Check Firestore rules."
            : error?.code === "failed-precondition"
              ? "The ants couldn't reach their colony. Create the Firestore database in Firebase Console."
              : "The ants couldn't reach their colony. Check your Firebase setup.";

        setStatus(message);
      }
    );
  }, [joined, room]);

  function joinRoom(e) {
    e.preventDefault();
    const cleanRoom = room.trim().toLowerCase();
    const cleanName = name.trim() || "someone";
    if (!cleanRoom) return;
    localStorage.setItem(ROOM_KEY, cleanRoom);
    localStorage.setItem(NAME_KEY, cleanName);
    setRoom(cleanRoom);
    setName(cleanName);
    setJoined(true);
  }

  function leaveRoom() {
    localStorage.removeItem(ROOM_KEY);
    localStorage.removeItem(NAME_KEY);
    setJoined(false);
    setMessages([]);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !room) return;

    setDraft("");
    await addDoc(collection(db, "rooms", room, "messages"), {
      text,
      sender: name || "someone",
      createdAt: serverTimestamp(),
      clientId: makeId(),
    });
  }

  async function eatMessage(id) {
    if (eatingId !== null) return;

    setEatingId(id);
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, "rooms", room, "messages", id));
          } catch (error) {
            console.error(error);
            setEatingId(null);
            setStatus("The anteater got distracted. Try again.");
          }
        }, 3200);
  }

  const unreadCount = useMemo(() => messages.length, [messages]);

  if (!joined) {
    return (
      <main className="landing">
        <div className="anthill-card">
          <div className="logo-ants" aria-hidden="true">
            <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
          </div>
          <h1>ant talk</h1>

          <form onSubmit={joinRoom} className="join-form">
            <label>
              your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="alice"
                autoComplete="off"
              />
            </label>

            <label>
              secret anthill
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="a secret word you both know"
                autoComplete="off"
              />
            </label>

            <button type="submit">go →</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="brand">ant talk</div>
          <div className="room-label">anthill: {room}</div>
        </div>
        <button className="quiet-button" onClick={leaveRoom}>leave anthill</button>
      </header>

      <section className="dirt">
        <div className="dirt-grain" />
        <div className="hero-copy">
          <p className="eyebrow">the colony has {unreadCount} {unreadCount === 1 ? "message" : "messages"}</p>
        </div>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty">
              <p>No messages yet.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article className="message-card" key={message.id}>
                <div className="message-meta">
                  <span>{message.sender || "someone"}</span>
                  <span>·</span>
                </div>
                <AntMessage
                  text={message.text}
                  eaten={eatingId === message.id}
                />
                <button
                  className="eat-button"
                  onClick={() => eatMessage(message.id)}
                  disabled={eatingId !== null}
                >
                  {eatingId === message.id ? "the anteater is coming…" : "send the anteater →"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="write-section">
        <div className="write-inner">
          <div>
            <h3>sniff... snifff... sniiiiiiff...</h3>
          </div>
          <form onSubmit={sendMessage} className="message-form">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={180}
              placeholder="crawling..."
              rows={3}
            />
            <div className="form-footer">
              <span>{draft.length}/180</span>
              <button type="submit" disabled={!draft.trim()}>
                send the ants →
              </button>
            </div>
          </form>
        </div>
      </section>

      {status && <div className="toast">{status}</div>}
    </main>
  );
}
