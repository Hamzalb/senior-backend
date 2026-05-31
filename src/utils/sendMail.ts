import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: MailOptions) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER and EMAIL_PASS are not set");
  }

  const pass = emailPass.replace(/\s/g, ""); // strip spaces from app password

  // Try port 587 STARTTLS first, then fall back to port 465 SSL
  const configs = [
    { host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true, tls: { rejectUnauthorized: false } },
    { host: "smtp.gmail.com", port: 465, secure: true,  tls: { rejectUnauthorized: false } },
  ];

  let lastError: any;
  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport({
        ...config,
        connectionTimeout: 20000,
        socketTimeout:     20000,
        auth: { user: emailUser, pass },
      });
      await transporter.sendMail({
        from:    `"yalla nbadel" <${emailUser}>`,
        to, subject, text,
        ...(html ? { html } : {}),
      });
      return; // success
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError; // both configs failed
};
