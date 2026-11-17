
export const passwordRules = [
  {
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    label: 'One uppercase letter (A–Z)',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'One lowercase letter (a–z)',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'One number (0–9)',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    label: 'One special character (!@#$%^&*)',
    test: (password: string) => /[^A-Za-z0-9\s]/.test(password),
  },
];

export function isStrongPassword(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password));
}

export function getPasswordStrength(password: string): number {
  return passwordRules.filter((rule) => rule.test(password)).length;
}
