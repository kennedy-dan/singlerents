'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import PageLoader from '../components/PageLoader';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const currentId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [userResponse, conversationsResponse] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/messages'),
      ]);

      if (userResponse.ok) setUser((await userResponse.json()).user);
      if (conversationsResponse.ok) {
        const conversations = (await conversationsResponse.json()).conversations;
        setItems(conversations);
        setCurrent((selected) => selected || conversations[0] || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(async (id: string) => {
    const response = await fetch(`/api/messages?conversationId=${id}`);
    if (response.ok) setCurrent((await response.json()).conversation);
  }, []);

  useEffect(() => {
    currentId.current = current?.id || null;
  }, [current?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;

    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = 1000;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      socket.onopen = () => {
        reconnectDelay = 1000;
        void load();
      };
      socket.onmessage = ({ data }) => {
        try {
          if (JSON.parse(data).event === 'message') {
            void load();
            if (currentId.current) void open(currentId.current);
          }
        } catch {
          // Ignore malformed WebSocket frames.
        }
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
  }, [user?.id, load, open]);

  async function send(event) {
    event.preventDefault();
    if (!current || !body) return;
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: current.id, body }),
    });
    if (response.ok) {
      setBody('');
      void open(current.id);
      void load();
    }
  }

  const other = (conversation) =>
    conversation?.tenantId === user?.id ? conversation.landlord : conversation.tenant;

  if (loading) return <><Header /><PageLoader label="Loading messages…" /></>;
  return <><Header /><main className="page"><p className="eyebrow">INBOX</p><h1>Messages</h1>{!user ? <p>Please <a href="/login">log in</a> to view messages.</p> : <div className="inbox"><aside>{items.map((conversation) => <button className={'conversation ' + (conversation.id === current?.id ? 'selected' : '')} onClick={() => open(conversation.id)} key={conversation.id}><b>{other(conversation)?.name}</b><small>{conversation.messages?.[0]?.body || 'Start a conversation'}</small></button>)}{!items.length && <p className="muted">Message a landlord from a room listing to begin.</p>}</aside><section className="panel thread">{current ? <><h3>{other(current)?.name}</h3><div className="thread-messages">{current.messages?.map((message) => <p className={message.senderId === user.id ? 'mine' : 'theirs'} key={message.id}>{message.body}</p>)}</div><form className="message-form" onSubmit={send}><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message" /><button className="button">Send</button></form></> : <p className="muted">Choose a conversation.</p>}</section></div>}</main></>;
}
