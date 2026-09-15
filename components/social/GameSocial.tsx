"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { MessageCircle, Send, Smile, X } from "lucide-react";
import { getSocialStore } from "@/lib/social/store";
import { HAKO_REACTIONS, QUICK_REACTIONS, STANDARD_REACTIONS, reactionById } from "@/lib/social/reactions";
import type { SocialGame, SocialMessage, SocialParticipant, SocialReaction } from "@/lib/social/types";
import styles from "./GameSocial.module.css";

const REACTION_COOLDOWN_MS = 850;
const BURST_LIFETIME_MS = 3600;
const FRESH_REACTION_MS = 5000;

export default function GameSocial({
  game,
  code,
  participant,
}: {
  game: SocialGame;
  code: string;
  participant: SocialParticipant;
}) {
  const store = useMemo(() => getSocialStore(), []);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bursts, setBursts] = useState<SocialReaction[]>([]);
  const chatOpenRef = useRef(false);
  const knownMessages = useRef(new Set<string>());
  const messagesInitialized = useRef(false);
  const seenReactionIds = useRef(new Set<string>());
  const burstTimers = useRef<number[]>([]);
  const lastReactionAt = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  const uid = participant.uid;
  const nickname = participant.nickname;
  const role = participant.role;

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    let live = true;
    let stop: (() => void) | undefined;
    void store.subscribeMessages(game, code, (next) => {
      if (!live) return;
      setMessages(next);
      if (!messagesInitialized.current) {
        next.forEach((message) => knownMessages.current.add(message.id));
        messagesInitialized.current = true;
        return;
      }
      let fresh = 0;
      for (const message of next) {
        if (knownMessages.current.has(message.id)) continue;
        knownMessages.current.add(message.id);
        if (message.uid !== uid) fresh += 1;
      }
      if (fresh && !chatOpenRef.current) setUnread((value) => Math.min(99, value + fresh));
    }).then((unsubscribe) => {
      if (!live) unsubscribe();
      else stop = unsubscribe;
    }).catch(() => {});
    return () => {
      live = false;
      stop?.();
    };
  }, [code, game, store, uid]);

  useEffect(() => {
    let live = true;
    let stop: (() => void) | undefined;
    void store.subscribeReactions(game, code, (reaction) => {
      if (!live || Date.now() - reaction.createdAt > FRESH_REACTION_MS) return;
      if (seenReactionIds.current.has(reaction.id)) return;
      seenReactionIds.current.add(reaction.id);
      setBursts((current) => [...current.slice(-4), reaction]);
      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== reaction.id));
        seenReactionIds.current.delete(reaction.id);
      }, BURST_LIFETIME_MS);
      burstTimers.current.push(timer);
    }).then((unsubscribe) => {
      if (!live) unsubscribe();
      else stop = unsubscribe;
    }).catch(() => {});
    return () => {
      live = false;
      stop?.();
      burstTimers.current.forEach((timer) => window.clearTimeout(timer));
      burstTimers.current = [];
    };
  }, [code, game, store]);

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatOpen, messages.length]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await store.sendMessage(game, code, { uid, nickname, role }, text);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function sendReaction(reactionId: string) {
    const now = Date.now();
    if (now - lastReactionAt.current < REACTION_COOLDOWN_MS) return;
    lastReactionAt.current = now;
    await store.sendReaction(game, code, { uid, nickname, role }, reactionId).catch(() => {});
  }

  function handleComposerKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  }

  return <div className={styles.root}>
    <div className={styles.stream} aria-live="polite" aria-atomic="false">
      {bursts.map((burst, index) => <ReactionBurst key={burst.id} reaction={burst} index={index}/>)}
    </div>

    <aside className={styles.rail} aria-label="Hızlı tepkiler ve chat">
      {QUICK_REACTIONS.map((reaction) => <button
        key={reaction.id}
        type="button"
        className={`${styles.quickReaction} ${reaction.kind === "sticker" ? styles.quickSticker : ""}`}
        title={reaction.label}
        aria-label={`${reaction.label} tepkisi gönder`}
        onClick={() => void sendReaction(reaction.id)}
      >
        {reaction.kind === "emoji"
          ? <span>{reaction.emoji}</span>
          : <img src={reaction.asset} alt="" draggable={false}/>}
      </button>)}

      <button
        type="button"
        className={`${styles.railAction} ${pickerOpen ? styles.active : ""}`}
        aria-label="Tüm tepkileri aç"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((value) => !value)}
      ><Smile size={20}/></button>

      <button
        type="button"
        className={`${styles.railAction} ${styles.chatButton} ${chatOpen ? styles.active : ""}`}
        aria-label="Chat'i aç"
        aria-expanded={chatOpen}
        onClick={() => {
          setChatOpen(true);
          setPickerOpen(false);
        }}
      >
        <MessageCircle size={20}/>
        {unread > 0 && <b className={styles.unread}>{unread > 9 ? "9+" : unread}</b>}
      </button>
    </aside>

    {pickerOpen && <section className={styles.picker} aria-label="Tepki seç">
      <header><div><small>TEPKİ GÖNDER</small><strong>Masaya bir şey bırak 😄</strong></div><button type="button" onClick={() => setPickerOpen(false)} aria-label="Tepkileri kapat"><X size={18}/></button></header>
      <div className={styles.emojiGrid}>
        {STANDARD_REACTIONS.map((reaction) => <button key={reaction.id} type="button" onClick={() => void sendReaction(reaction.id)} title={reaction.label}><span>{reaction.emoji}</span><small>{reaction.label}</small></button>)}
      </div>
      <div className={styles.packHeading}><span>👑</span><div><b>Hakö Baba Pack</b><small>Özel masa tepkileri</small></div></div>
      <div className={styles.stickerGrid}>
        {HAKO_REACTIONS.map((reaction) => <button key={reaction.id} type="button" onClick={() => void sendReaction(reaction.id)} title={reaction.label}>
          <img src={reaction.asset} alt="" draggable={false}/>
          <small>{reaction.label}</small>
        </button>)}
      </div>
    </section>}

    {chatOpen && <div className={styles.chatLayer}>
      <button className={styles.dismiss} aria-label="Chat'i kapat" onClick={() => setChatOpen(false)}/>
      <section className={styles.chatSheet} role="dialog" aria-modal="true" aria-label="Oda sohbeti">
        <header className={styles.chatHeader}>
          <div><small>ODA SOHBETİ</small><strong>{code.toUpperCase()}</strong></div>
          <button type="button" onClick={() => setChatOpen(false)} aria-label="Chat'i kapat"><X size={20}/></button>
        </header>
        <div className={styles.messages}>
          {!messages.length && <div className={styles.emptyChat}><span>💬</span><b>İlk mesajı sen at.</b><small>Oyun devam ederken burası masanın sohbeti.</small></div>}
          {messages.map((message) => <ChatBubble key={message.id} message={message} mine={message.uid === uid}/>)}
          <div ref={endRef}/>
        </div>
        <form className={styles.composer} onSubmit={(event) => void sendMessage(event)}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 160))}
            onKeyDown={handleComposerKey}
            placeholder="Mesaj yaz…"
            maxLength={160}
            aria-label="Mesaj"
          />
          <span>{draft.length}/160</span>
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Mesajı gönder"><Send size={19}/></button>
        </form>
      </section>
    </div>}
  </div>;
}

function ChatBubble({ message, mine }: { message: SocialMessage; mine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return <article className={`${styles.message} ${mine ? styles.mine : ""}`}>
    <div className={styles.messageMeta}>
      <span className={styles.avatar}>{message.nickname.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
      <div><b>{message.nickname}</b>{message.role === "moderator" && <em>MOD</em>}<small>{time}</small></div>
    </div>
    <p>{message.text}</p>
  </article>;
}

function ReactionBurst({ reaction, index }: { reaction: SocialReaction; index: number }) {
  const option = reactionById(reaction.reaction);
  if (!option) return null;
  return <div className={`${styles.burst} ${option.kind === "sticker" ? styles.stickerBurst : ""}`} style={{ "--burst-index": index } as CSSProperties}>
    <span className={styles.burstName}>{reaction.nickname}{reaction.role === "moderator" ? " · MOD" : ""}</span>
    {option.kind === "emoji"
      ? <strong>{option.emoji}</strong>
      : <img src={option.asset} alt={option.label} draggable={false}/>}
    <small>{option.label}</small>
  </div>;
}
