const getPasswordStrength = (password: string) => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  return strength;
};

export { getPasswordStrength };