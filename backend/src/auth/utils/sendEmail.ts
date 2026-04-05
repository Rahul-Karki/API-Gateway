import { Resend } from 'resend';
import { logger } from '../../observability/observability';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  const log = logger.child({ component: 'auth.send_email' });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject,
    html,
  });

  if (error) {
    log.error({ event: 'email_send', status: 'error', error, to, subject }, 'Resend error');
    throw new Error(error.message);
  }

  log.info({ event: 'email_send', status: 'success', messageId: data?.id, to, subject }, 'Email sent successfully');
};