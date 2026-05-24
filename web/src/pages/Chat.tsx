import { FormEvent, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { getSocket } from '../socket';
import { OWNER_TEMPLATES } from '../chat-templates';
import { DealBar } from '../components/DealBar';
import type { ChatMessage } from '../types';
import type { DealStatus } from '../deal-status';
import './Chat.css';

interface ThreadInfo {
  id: string;
  productTitle?: string;
  otherName?: string;
  otherUserId?: string;
  isOwner: boolean;
  dealStatus: DealStatus;
  agreedPrice?: string;
  ownerAcceptedContact: boolean;
}

export function Chat() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [location, setLocation] = useState<{ address: string; lat?: number; lng?: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(() => {
    if (!threadId) return;
    api<ThreadInfo>(`/chat/threads/${threadId}`).then(setThread).catch(() => {});
  }, [threadId]);

  const loadMessages = useCallback(() => {
    if (!threadId) return;
    api<{ data: ChatMessage[] }>(`/chat/threads/${threadId}/messages`)
      .then((res) => setMessages(res.data))
      .catch(() => {});
  }, [threadId]);

  useEffect(() => {
    loadThread();
    loadMessages();
    const s = getSocket();
    if (!s || !threadId) return;
    s.emit('chat:join', threadId);
    const onMsg = (msg: ChatMessage & { threadId: string }) => {
      if (msg.threadId === threadId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    const onDeal = (t: ThreadInfo) => {
      if (t.id === threadId) setThread(t);
    };
    s.on('chat:message', onMsg);
    s.on('deal:updated', onDeal);
    return () => {
      s.emit('chat:leave', threadId);
      s.off('chat:message', onMsg);
      s.off('deal:updated', onDeal);
    };
  }, [threadId, loadThread, loadMessages]);

  useEffect(() => {
    if (
      thread &&
      (thread.dealStatus === 'AGREED' ||
        thread.dealStatus === 'PICKED_UP' ||
        thread.dealStatus === 'CLOSED') &&
      thread.ownerAcceptedContact &&
      !thread.isOwner &&
      !location
    ) {
      api<{ address: string; lat: number; lng: number }>(
        `/chat/threads/${threadId}/reveal-location`,
      ).then(setLocation).catch(() => {});
    }
  }, [thread, threadId, location]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(content: string) {
    if (!threadId || !content.trim() || thread?.dealStatus === 'CLOSED') return;
    setError('');
    try {
      await api(`/chat/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ type: 'TEXT', content: content.trim() }),
      });
      setText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    }
  }

  async function confirmDeal(agreedPrice: number) {
    if (!threadId) return;
    setBusy(true);
    try {
      const t = await api<ThreadInfo>(`/chat/threads/${threadId}/confirm-deal`, {
        method: 'PATCH',
        body: JSON.stringify({ agreedPrice }),
      });
      setThread(t);
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function reportUser() {
    if (!thread?.otherUserId) return;
    const reason = window.prompt('Motivo del reporte (ej. no respondió, fraude)');
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedId: thread.otherUserId,
          threadId: thread.id,
          reason: reason.trim(),
        }),
      });
      setError('');
      alert('Reporte enviado. Gracias.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function blockUser() {
    if (!thread?.otherUserId) return;
    if (!window.confirm('¿Bloquear a este usuario? No podrán chatear contigo.')) return;
    setBusy(true);
    try {
      await api('/reports/block', {
        method: 'POST',
        body: JSON.stringify({ blockedId: thread.otherUserId }),
      });
      alert('Usuario bloqueado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function markPickedUp() {
    if (!threadId) return;
    setBusy(true);
    try {
      const t = await api<ThreadInfo>(`/chat/threads/${threadId}/deal-status`, {
        method: 'PATCH',
        body: JSON.stringify({ dealStatus: 'PICKED_UP' }),
      });
      setThread(t);
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function closeDeal() {
    if (!threadId) return;
    setBusy(true);
    try {
      const t = await api<ThreadInfo>(`/chat/threads/${threadId}/deal-status`, {
        method: 'PATCH',
        body: JSON.stringify({ dealStatus: 'CLOSED' }),
      });
      setThread(t);
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <p className="empty container">
        <Link to="/entrar">Inicia sesión</Link>
      </p>
    );
  }

  return (
    <div className="container chat-page">
      <Link to="/mensajes" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>← Chats</Link>
      {thread && (
        <div className="chat-header-row">
          <p style={{ fontWeight: 600, marginTop: 8, flex: 1 }}>
            {thread.productTitle} · {thread.otherName}
          </p>
          {thread.otherUserId && thread.dealStatus !== 'CLOSED' && (
            <div className="chat-safety-btns">
              <button type="button" className="btn btn-ghost btn-sm" onClick={reportUser} disabled={busy}>
                Reportar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={blockUser} disabled={busy}>
                Bloquear
              </button>
            </div>
          )}
        </div>
      )}

      {thread && (
        <DealBar
          dealStatus={thread.dealStatus}
          agreedPrice={thread.agreedPrice}
          isOwner={thread.isOwner}
          onConfirmDeal={thread.isOwner ? confirmDeal : undefined}
          onMarkPickedUp={thread.isOwner ? markPickedUp : undefined}
          onCloseDeal={thread.isOwner ? closeDeal : undefined}
          busy={busy}
        />
      )}

      {location && (
        <div className="card location-card">
          <strong>📍 Ubicación para recoger</strong>
          <p>{location.address}</p>
          {location.lat && (
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="maps-link"
            >
              Abrir en Google Maps
            </a>
          )}
        </div>
      )}

      <div className="chat-messages card">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble ${
              m.type === 'SYSTEM' ? 'system' : m.senderId === user.id ? 'mine' : 'theirs'
            }`}
          >
            {m.type === 'QUESTIONNAIRE_ANSWER' ? '✓ Cuestionario completado' : m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {thread?.isOwner && thread.dealStatus !== 'CLOSED' && (
        <div className="template-row">
          {OWNER_TEMPLATES.map((t) => (
            <button key={t} type="button" className="template-btn" onClick={() => send(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {thread?.dealStatus !== 'CLOSED' && (
        <form
          className="chat-input-row"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensaje..."
          />
          <button type="submit" className="btn btn-primary">Enviar</button>
        </form>
      )}
    </div>
  );
}
