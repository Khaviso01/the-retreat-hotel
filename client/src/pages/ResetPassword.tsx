import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { send } from '../lib/api';
import { PasswordRequirements } from '../components/shared/PasswordRequirements';
import { isStrongPassword } from '../lib/password';

// ResetPassword component allows users to reset their password using a token from the email link.
export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Read the reset token from the email link
  const token = params.get('token');

  // State variables for form inputs and status messages
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle form submission for password reset
  const submit = async (e: FormEvent) => {
    e.preventDefault();

    setError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate the reset token.
    if (!token) {
      setError('Invalid password reset link.');
      return;
    }

    // Validate the new password.
    if (!isStrongPassword(password)) {
      setPasswordError(
        'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.'
      );
      return;
    }

    // Validate password confirmation.
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await send('/auth/reset-password', 'POST', {
        token,
        password,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>The Retreat</h1>
        <small>HOTELS & SUITES</small>

        {success ? (
          <>
            <LockKeyhole size={36} />
            <h2>Password Reset Successful!</h2>

            <p className="muted">
              Your password has been updated successfully.
              You can now sign in using your new password.
            </p>

            <button
              className="btn wide"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <h2>Reset Password</h2>

            <p className="muted">
              Enter your new password below.
            </p>

            {!token ? (
              <p className="error" role="alert">
                This password reset link is invalid or missing a token.
              </p>
            ) : (
              <form onSubmit={submit}>
                <label>
                  New Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Enter new password"
                  />
                </label>

                <PasswordRequirements password={password} />

                {passwordError && (
                  <p className="password-field-error" role="alert">
                    {passwordError}
                  </p>
                )}

                <label>
                  Confirm Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError('');
                    }}
                    placeholder="Confirm new password"
                  />
                </label>

                {confirmPasswordError && (
                  <p className="password-field-error" role="alert">
                    {confirmPasswordError}
                  </p>
                )}

                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn wide"
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <Link to="/login" className="back">
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
