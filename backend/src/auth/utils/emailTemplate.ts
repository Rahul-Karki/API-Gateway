export const forgotPasswordTemplate = (resetLink: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Reset Your Password</h2>
    <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
    <a href="${resetLink}"
       style="background:#4F46E5; color:white; padding:12px 24px;
              border-radius:6px; text-decoration:none; display:inline-block;">
      Reset Password
    </a>
    <p style="margin-top:16px; color:#888; font-size:12px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
`;