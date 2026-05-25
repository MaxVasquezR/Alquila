import { FormEvent, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { getSocket } from '../socket';
import { OWNER_TEMPLATES } from '../chat-templates';
import { DealBar } from '../components/DealBar';
import { useToast } from '../components/Toast';
import type { ChatMessage, DealCheckpoint } from '../types';
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
  const toast = useToast();
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [location, setLocation] = useState<{ address: string; lat?: number; lng?: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkpoints, setCheckpoints] = useState<DealCheckpoint[]>([]);
  const [checkpointFiles, setCheckpointFiles] = useState<File[]>([]);
  const [checkpointNotes, setCheckpointNotes] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Comportamiento sospechoso');
  const [reportDetails, setReportDetails] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
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

  const loadCheckpoints = useCallback(() => {
    if (!threadId) return;
    api<{ data: DealCheckpoint[] }>(`/chat/threads/${threadId}/checkpoints`)
      .then((res) => setCheckpoints(res.data))
      .catch(() => {});
  }, [threadId]);

  useEffect(() => {
    loadThread();
    loadMessages();
    loadCheckpoints();
    const s = getSocket();
    if (!s || !threadId) return;
    s.emit('chat:join', threadId);
    const onMsg = (msg: ChatMessage & { threadId: string }) => {
      if (msg.threadId === threadId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    const onDeal = (t: ThreadInfo) => {
      if (t.id === threadId) loadThread();
    };
    s.on('chat:message', onMsg);
    s.on('deal:updated', onDeal);
    return () => {
      s.emit('chat:leave', threadId);
      s.off('chat:message', onMsg);
      s.off('deal:updated', onDeal);
    };
  }, [threadId, loadThread, loadMessages, loadCheckpoints]);

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

  const checkpointPreviewUrls = useMemo(
    () => checkpointFiles.map((file) => URL.createObjectURL(file)),
    [checkpointFiles],
  );

  useEffect(() => () => {
    checkpointPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [checkpointPreviewUrls]);

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
    if (!reportReason.trim()) return;
    setBusy(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedId: thread.otherUserId,
          threadId: thread.id,
          reason: reportReason.trim(),
          details: reportDetails.trim() || undefined,
        }),
      });
      setError('');
      setReportOpen(false);
      setReportDetails('');
      toast('Reporte enviado. Gracias por avisarnos.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function blockUser() {
    if (!thread?.otherUserId) return;
    setBusy(true);
    try {
      await api('/reports/block', {
        method: 'POST',
        body: JSON.stringify({ blockedId: thread.otherUserId }),
      });
      setBlockOpen(false);
      toast('Usuario bloqueado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function startHandoff() {
    if (!threadId) return;
    setBusy(true);
    try {
      const t = await api<ThreadInfo>(`/chat/threads/${threadId}/deal-status`, {
        method: 'PATCH',
        body: JSON.stringify({ dealStatus: 'HANDOFF_PENDING' }),
      });
      setThread(t);
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function startReturn() {
    if (!threadId) return;
    setBusy(true);
    try {
      const t = await api<ThreadInfo>(`/chat/threads/${threadId}/deal-status`, {
        method: 'PATCH',
        body: JSON.stringify({ dealStatus: 'RETURN_PENDING' }),
      });
      setThread(t);
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckpoint() {
    if (!threadId || !thread) return;
    if (checkpointFiles.length !== 4) {
      setError('Debes subir exactamente 4 fotos claras.');
      return;
    }
    const stage =
      thread.dealStatus === 'HANDOFF_PENDING'
        ? 'HANDOFF'
        : thread.dealStatus === 'RETURN_PENDING'
          ? 'RETURN'
          : null;
    if (!stage) return;

    setBusy(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('stage', stage);
      if (checkpointNotes.trim()) payload.append('notes', checkpointNotes.trim());
      checkpointFiles.forEach((file) => payload.append('images', file));
      const result = await api<{ thread: ThreadInfo; checkpoint: DealCheckpoint }>(
        `/chat/threads/${threadId}/checkpoints`,
        {
          method: 'POST',
          body: payload,
        },
      );
      setThread(result.thread);
      setCheckpointFiles([]);
      setCheckpointNotes('');
      loadMessages();
      loadCheckpoints();
      toast(
        stage === 'HANDOFF'
          ? 'Entrega registrada con 4 fotos.'
          : 'Recepción registrada y trato cerrado.',
      );
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

  const nextStepText =
    thread?.dealStatus === 'INTERESTED'
      ? 'Aún están negociando. Dejen por escrito precio, horario y condiciones.'
      : thread?.dealStatus === 'AGREED'
        ? 'El precio ya fue acordado. Inicia la entrega y prepara 4 fotos claras del equipo.'
        : thread?.dealStatus === 'HANDOFF_PENDING'
          ? 'La entrega está abierta. Sube 4 fotos claras para registrar el estado del equipo.'
        : thread?.dealStatus === 'PICKED_UP'
          ? 'El equipo ya fue entregado. Cuando vuelva, abre la recepción y toma otras 4 fotos.'
          : thread?.dealStatus === 'RETURN_PENDING'
            ? 'La recepción está abierta. Sube 4 fotos claras para cerrar el trato.'
          : 'El trato terminó. Puedes revisar el historial o volver a contactar.';

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
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setBlockOpen(false);
                  setReportOpen((prev) => !prev);
                }}
                disabled={busy}
              >
                Reportar
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setReportOpen(false);
                  setBlockOpen((prev) => !prev);
                }}
                disabled={busy}
              >
                Bloquear
              </button>
            </div>
          )}
        </div>
      )}

      {thread && (
        <div className="card chat-safety-card">
          <strong>Resumen del trato</strong>
          <p>{nextStepText}</p>
          <ul className="trust-list">
            <li>Confirma precio, horario y condiciones antes de moverte.</li>
            <li>No compartas códigos, claves ni documentos fuera del flujo acordado.</li>
            <li>Si algo te parece riesgoso, reporta o bloquea desde este mismo chat.</li>
          </ul>
        </div>
      )}

      {reportOpen && (
        <div className="card chat-action-panel">
          <strong>Reportar usuario</strong>
          <p>Describe brevemente el problema para que podamos revisar el incidente.</p>
          <div className="field">
            <label className="label">Motivo</label>
            <input
              className="input"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Ej: intento de fraude, presión fuera de la app"
            />
          </div>
          <div className="field">
            <label className="label">Detalle adicional (opcional)</label>
            <textarea
              className="textarea"
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Cuéntanos lo mínimo necesario para entender el caso."
            />
          </div>
          <div className="chat-action-row">
            <button type="button" className="btn btn-express" onClick={reportUser} disabled={busy}>
              {busy ? 'Enviando...' : 'Enviar reporte'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {blockOpen && (
        <div className="card chat-action-panel">
          <strong>Bloquear usuario</strong>
          <p>No podrán seguir chateando contigo desde este hilo si confirmas el bloqueo.</p>
          <div className="chat-action-row">
            <button type="button" className="btn btn-primary" onClick={blockUser} disabled={busy}>
              {busy ? 'Bloqueando...' : 'Sí, bloquear'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setBlockOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {thread && (
        <DealBar
          dealStatus={thread.dealStatus}
          agreedPrice={thread.agreedPrice}
          isOwner={thread.isOwner}
          onConfirmDeal={thread.isOwner ? confirmDeal : undefined}
          onStartHandoff={thread.isOwner ? startHandoff : undefined}
          onStartReturn={thread.isOwner ? startReturn : undefined}
          busy={busy}
        />
      )}

      {thread && (thread.dealStatus === 'HANDOFF_PENDING' || thread.dealStatus === 'RETURN_PENDING') && (
        <div className="card chat-action-panel">
          <strong>
            {thread.dealStatus === 'HANDOFF_PENDING'
              ? 'Entrega con 4 fotos obligatorias'
              : 'Recepción con 4 fotos obligatorias'}
          </strong>
          <p>
            {thread.isOwner
              ? 'Toma fotos claras del equipo, accesorios y estado general. Sin las 4 fotos no avanza el trato.'
              : 'Espera a que el dueño suba las 4 fotos obligatorias para seguir al siguiente paso.'}
          </p>
          {thread.isOwner && (
            <>
              <div className="field">
                <label className="label">4 fotos claras</label>
                <input
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => setCheckpointFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                />
              </div>
              {checkpointPreviewUrls.length > 0 && (
                <div className="chat-checkpoint-grid">
                  {checkpointPreviewUrls.map((url, index) => (
                    <img key={url} src={url} alt={`Evidencia ${index + 1}`} className="chat-checkpoint-thumb" />
                  ))}
                </div>
              )}
              <div className="field">
                <label className="label">Observación rápida (opcional)</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={checkpointNotes}
                  onChange={(e) => setCheckpointNotes(e.target.value)}
                  placeholder="Ej: se entrega limpio, con cable y accesorios completos."
                />
              </div>
              <button type="button" className="btn btn-express" onClick={submitCheckpoint} disabled={busy}>
                {busy ? 'Guardando...' : 'Guardar 4 fotos y continuar'}
              </button>
            </>
          )}
        </div>
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

      {checkpoints.length > 0 && (
        <div className="card chat-safety-card">
          <strong>Evidencias del trato</strong>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="chat-checkpoint-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>
                    {checkpoint.stage === 'HANDOFF' ? 'Entrega' : 'Recepción'} · {checkpoint.submittedBy ?? 'Usuario'}
                  </strong>
                  <span className="thread-preview">{new Date(checkpoint.createdAt).toLocaleString()}</span>
                </div>
                {checkpoint.notes && <p className="thread-preview" style={{ marginTop: 6 }}>{checkpoint.notes}</p>}
                <div className="chat-checkpoint-grid">
                  {checkpoint.photos.map((photo) => (
                    <img key={photo.id} src={photo.url} alt="Evidencia del trato" className="chat-checkpoint-thumb" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
