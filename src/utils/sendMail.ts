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

  const transporter = nodemailer.createTransport({
    host:              "smtp.gmail.com",
    port:              465,
    secure:            true,
    connectionTimeout: 15000,   // fail fast if Gmail doesn't respond
    greetingTimeout:   10000,
    socketTimeout:     15000,
    auth: {
      user: emailUser,
      pass: emailPass.replace(/\s/g, ""),
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
