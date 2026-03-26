import nodemailer from "nodemailer";

export const sendEmail = async (to: string, link: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Auth App" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Password",
    html: `
      <h3>Password Reset</h3>
      <p>Click below:</p>
      <a href="${link}">${link}</a>
    `,
  });
};