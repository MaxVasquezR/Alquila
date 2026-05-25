import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './Commerce.css';

function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="container page-narrow trust-page">
      <Link to="/" className="back-link">
        ← Volver al mercado
      </Link>
      <div className="page-header">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <div className="card trust-page-card">{children}</div>
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <PageShell
      title="Cómo funciona"
      intro="Alquila conecta dueños e inquilinos para alquileres rápidos en Lima sin mostrar datos sensibles en público."
    >
      <ul className="trust-list">
        <li>Explora equipos cerca de tu zona y revisa si el dueño está verificado.</li>
        <li>Abre chat, acuerda precio, horario y condiciones antes de moverte.</li>
        <li>La dirección exacta solo se comparte dentro del flujo del trato.</li>
        <li>Confirma la entrega, recoge y cierra el alquiler cuando ambas partes terminen.</li>
      </ul>
    </PageShell>
  );
}

export function SafetyPage() {
  return (
    <PageShell
      title="Seguridad en Alquila"
      intro="Estas reglas ayudan a reducir fraudes y malos entendidos en un marketplace P2P express."
    >
      <ul className="trust-list">
        <li>Haz todo el acuerdo dentro del chat: precio, hora, punto de encuentro y reglas de uso.</li>
        <li>No compartas documentos, claves, códigos ni pagos fuera de canales oficiales.</li>
        <li>Revisa el estado del equipo al entregarlo y al devolverlo.</li>
        <li>Si detectas comportamiento sospechoso, reporta o bloquea al usuario desde el chat.</li>
        <li>Para productos caros o sensibles, documenta el estado con fotos antes de entregar.</li>
      </ul>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell
      title="Privacidad"
      intro="Alquila limita la exposición pública de información personal para que puedas negociar con más seguridad."
    >
      <ul className="trust-list">
        <li>No mostramos dirección exacta, teléfono ni nombre legal en listados públicos.</li>
        <li>La ubicación exacta se revela solo dentro del flujo del trato cuando corresponde.</li>
        <li>Usamos verificación de cuenta para reducir perfiles falsos y abuso del sistema.</li>
        <li>La información sensible se usa para operar la plataforma y prevenir fraude.</li>
      </ul>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell
      title="Términos básicos"
      intro="Alquila opera como un marketplace P2P. Las condiciones finales del alquiler las acuerdan directamente los usuarios."
    >
      <ul className="trust-list">
        <li>Debes publicar información real, legal y suficiente sobre el equipo ofrecido.</li>
        <li>No puedes usar la plataforma para actividades ilícitas, suplantación o fraude.</li>
        <li>Alquila puede suspender cuentas, publicaciones o chats ante reportes o abuso.</li>
        <li>Los cobros de publicación o membresía se rigen por las reglas visibles al momento de usar el servicio.</li>
      </ul>
    </PageShell>
  );
}

export function HelpPage() {
  return (
    <PageShell
      title="Ayuda y soporte"
      intro="Si tienes dudas sobre verificación, publicaciones o incidentes, este es el punto de partida."
    >
      <div className="trust-page-sections">
        <div>
          <h3>Antes del alquiler</h3>
          <p>Verifica tu cuenta, publica información clara y conversa siempre dentro del chat.</p>
        </div>
        <div>
          <h3>Durante el trato</h3>
          <p>Confirma precio, horario y estado del equipo antes de salir a recoger o entregar.</p>
        </div>
        <div>
          <h3>Incidentes</h3>
          <p>Usa las acciones de reportar o bloquear si detectas fraude, presión o comportamiento riesgoso.</p>
        </div>
      </div>
    </PageShell>
  );
}
