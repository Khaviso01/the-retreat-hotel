
import { Check, X } from 'lucide-react';
import { getPasswordStrength, passwordRules } from '../../lib/password';

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  const strength = getPasswordStrength(password);

  const strengthLabel =
    strength <= 2 ? 'Weak' : strength <= 4 ? 'Almost there' : 'Strong';

  return (
    <div className="password-requirements" aria-live="polite">
      <div className="password-strength">
        <span>Password strength</span>
        <strong>{password ? strengthLabel : 'Not entered'}</strong>
      </div>

      <div className="password-strength-bars" aria-hidden="true">
        {passwordRules.map((rule, index) => (
          <span
            key={rule.label}
            className={index < strength ? 'filled' : ''}
          />
        ))}
      </div>

      <ul>
        {passwordRules.map((rule) => {
          const passed = rule.test(password);

          return (
            <li key={rule.label} className={passed ? 'passed' : ''}>
              {passed ? <Check size={15} /> : <X size={15} />}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
