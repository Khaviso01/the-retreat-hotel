import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { send } from '../lib/api';
import { useApp } from '../context/AppContext';
import { PasswordRequirements } from '../components/shared/PasswordRequirements';
import { isStrongPassword } from '../lib/password';

// GuestSecurity component allows users to change their password and manage security settings.
export default function GuestSecurity() {
  const { toast } = useApp();

  // State variables for form inputs and status messages
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');

  // Handle form submission for changing the password
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Validate the current password.
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Please enter your current password.');
      return;
    }

    // Validate the new password.
    if (!isStrongPassword(newPassword)) {
      setNewPasswordError(
        'New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.'
      );
      return;
    }

    // Validate password confirmation.
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('New passwords do not match.');
      return;
    }

    // Ensure the new password differs from the current password.
    if (currentPassword === newPassword) {
      setNewPasswordError('Choose a different password from your current one.');
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      await send(
        '/guest/profile/password',
        'PATCH',
        { currentPassword, newPassword }
      );

      // Clear the form after a successful password change.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast('Password updated successfully.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to change your password.';

      // Show incorrect-current-password errors beneath that field.
      if (/current password|old password|incorrect password/i.test(message)) {
        setCurrentPasswordError(message);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container section guest-account-page">
      <Link to="/profile" className="guest-account-back">
        <ArrowLeft size={18} />
        Back to Profile
      </Link>

      <div className="guest-account-heading">
        <h1>Password & Security</h1>
        <p>Protect your account by keeping your password secure.</p>
      </div>

      <form className="guest-account-card" onSubmit={handleSubmit}>
        <div className="guest-account-card-heading">
          <span className="guest-account-icon">
            <LockKeyhole size={22} />
          </span>
          <div>
            <h2>Change Password</h2>
            <p>Enter your current password to make changes.</p>
          </div>
        </div>

        <label className="guest-account-field">
          Current Password
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setCurrentPasswordError('');
            }}
            autoComplete="current-password"
            required
          />
          {currentPasswordError && (
            <span className="password-field-error" role="alert">
              {currentPasswordError}
            </span>
          )}
        </label>

        <label className="guest-account-field">
          New Password
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setNewPasswordError('');
            }}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <PasswordRequirements password={newPassword} />

        {newPasswordError && (
          <p className="password-field-error" role="alert">
            {newPasswordError}
          </p>
        )}

        <label className="guest-account-field">
          Confirm New Password
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setConfirmPasswordError('');
            }}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {confirmPasswordError && (
            <span className="password-field-error" role="alert">
              {confirmPasswordError}
            </span>
          )}
        </label>

        <button
          type="button"
          className="guest-account-toggle"
          onClick={() => setShowPasswords((value) => !value)}
          aria-pressed={showPasswords}
        >
          {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
          {showPasswords ? 'Hide passwords' : 'Show passwords'}
        </button>

        <div className="guest-account-security-tip">
          <ShieldCheck size={19} />
          <p>
            Use a unique password that meets all the security requirements above.
          </p>
        </div>

        {error && (
          <p className="guest-account-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn" disabled={saving}>
          <LockKeyhole size={17} />
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </main>
  );
}
