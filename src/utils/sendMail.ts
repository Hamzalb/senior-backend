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
    throw new Error("EMAIL_USER and EMAIL_PASS environment variables are not set");
  }

  // Use port 465 (SSL) — more reliable on cloud hosts than 587 (STARTTLS)
  const transporter = nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass.replace(/\s/g, ""), // strip spaces from app password
    },
  });

  await transporter.sendMail({
    from:    `"yalla nbadel" <${emailUser}>`,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
};
