// utils/sendEmail.ts
import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
}

export const sendEmail = async ({ to, subject, text }: MailOptions) => {
  const emailUser = process.env.EMAIL_USER || process.env.USER;
  const emailPass = process.env.EMAIL_PASS || process.env.PASS;

  if (!emailUser || !emailPass) {
    throw new Error(
      "Email credentials are not configured (expected EMAIL_USER/EMAIL_PASS or USER/PASS)"
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"Dakesh Support" <${emailUser}>`,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};
