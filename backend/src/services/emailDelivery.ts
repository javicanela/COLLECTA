type Attachment = {
  fileName: string;
  contentType: string;
  buffer: Buffer;
};

export function isEmailConfigured(): boolean {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  if (provider === 'smtp') {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
    );
  }
  return false;
}

async function sendWithResend(params: {
  to: string;
  subject: string;
  html: string;
  attachment: Attachment;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: [{
        filename: params.attachment.fileName,
        content: params.attachment.buffer.toString('base64'),
        content_type: params.attachment.contentType,
      }],
    }),
  });

  const data = await response.json().catch(() => ({})) as { message?: string; id?: string };
  if (!response.ok) {
    return { success: false, error: data?.message || 'resend_send_failed' };
  }

  return { success: true, messageId: data?.id };
}

async function sendWithSmtp(params: {
  to: string;
  subject: string;
  html: string;
  attachment: Attachment;
}) {
  let nodemailer: any;
  try {
    nodemailer = require('nodemailer');
  } catch {
    return { success: false, error: 'smtp_dependency_missing' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: [{
      filename: params.attachment.fileName,
      content: params.attachment.buffer,
      contentType: params.attachment.contentType,
    }],
  });

  return { success: true, messageId: info?.messageId };
}

export async function sendEmailWithAttachment(params: {
  to: string;
  subject: string;
  html: string;
  attachment: Attachment;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'email_not_configured' };
  }

  try {
    const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
    if (provider === 'resend') {
      return await sendWithResend(params);
    }
    if (provider === 'smtp') {
      return await sendWithSmtp(params);
    }
    return { success: false, error: 'email_provider_unsupported' };
  } catch {
    return { success: false, error: 'email_send_failed' };
  }
}
