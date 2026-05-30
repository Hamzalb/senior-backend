"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
// utils/sendEmail.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async ({ to, subject, text }) => {
    const emailUser = process.env.EMAIL_USER || process.env.USER;
    const emailPass = process.env.EMAIL_PASS || process.env.PASS;
    if (!emailUser || !emailPass) {
        throw new Error("Email credentials are not configured (expected EMAIL_USER/EMAIL_PASS or USER/PASS)");
    }
    const transporter = nodemailer_1.default.createTransport({
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
exports.sendEmail = sendEmail;
