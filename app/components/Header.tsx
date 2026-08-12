"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const [user, setUser] = useState(null),
    [unread, setUnread] = useState(0),
    [menuOpen, setMenuOpen] = useState(false),
    router = useRouter();
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setUser(v?.user || null));
  }, []);
  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setUnread(v?.unread || 0));
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = 1000;
    let stopped = false;
    const connect = () => {
      socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      socket.onopen = () => { reconnectDelay = 1000; };
      socket.onmessage = ({ data }) => {
        try {
          if (JSON.parse(data).event === "notification") setUnread((n) => n + 1);
        } catch {}
      };
      socket.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };
    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [user]);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`nav ${styles.header}`}>
      <Link className="brand" href="/">
        ⌂ singlerents
      </Link>
      <nav
        id="main-navigation"
        className={`${styles.navigation} ${menuOpen ? styles.open : ""}`}
        aria-label="Main navigation"
      >
        <Link className="link" href="/#rooms" onClick={closeMenu}>
          Find a room
        </Link>
    
        {user && (
          <Link className="link" href="/messages" onClick={closeMenu}>
            Messages
          </Link>
        )}
        {user && (
          <Link className="link" href="/dashboard" onClick={closeMenu}>
            {user.role === "LANDLORD" ? "My rooms" : "My payments"}
          </Link>
        )}
        {user && (
          <Link className="link" href="/profile" onClick={closeMenu}>
            Profile
          </Link>
        )}
        {!user && (
          <Link className="link" href="/register" onClick={closeMenu}>
            List a room
          </Link>
        )}
      </nav>
      <div className={styles.actions}>
        {user && (
          <Link
            className={styles.notificationBell}
            href="/notifications"
            onClick={closeMenu}
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className={styles.notificationBadge}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        )}
        <button
          className={styles.menuToggle}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.srOnly}>
            {menuOpen ? "Close" : "Open"} navigation menu
          </span>
          <span aria-hidden="true">☰</span>
        </button>
        {user ? (
          <div className="user-menu">
            <span>Hi, {user.name.split(" ")[0]}</span>
            <button className="link" onClick={logout}>
              Log out
            </button>
          </div>
        ) : (
          <Link href="/login">
            <button className="link">Log in</button>
          </Link>
        )}
      </div>
    </header>
  );
}
