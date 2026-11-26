
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, content, isHTML = false) => {
  const info = await transporter.sendMail({
    from: `"Poll App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    ...(isHTML ? { html: content } : { text: content }),
  });

  console.log(`Email sent to ${to}`, info.messageId);
  return info;
};
