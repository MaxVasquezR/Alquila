import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../middleware/error-handler';

export function hashEmailToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function canSendSmtp() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom);
}

export class EmailService {
  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${env.appUrl.replace(/\/$/, '')}/verificar?emailToken=${token}`;

    if (!canSendSmtp()) {
      if (env.isProduction) {
        throw new AppError(503, 'Email provider no configurado', 'EMAIL_PROVIDER_UNAVAILABLE');
      }
      console.log(`[DEV EMAIL] Verify ${email}: ${verificationUrl}`);
      return { previewUrl: verificationUrl };
    }

    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });

    await transporter.sendMail({
      from: env.smtpFrom,
      to: email,
      subject: 'Verifica tu correo en Alquila',
      text: `Verifica tu correo para activar tu cuenta y beneficios: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Verifica tu correo</h2>
          <p>Confirma tu email para activar tu cuenta y poder usar promociones iniciales reales.</p>
          <p><a href="${verificationUrl}">Verificar correo</a></p>
          <p>Si no reconoces este intento, ignora este mensaje.</p>
        </div>
      `,
    });

    return { previewUrl: undefined };
  }
}

export const emailService = new EmailService();
