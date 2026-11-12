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

// GuestSecurity component allows users to change their password and manage security settings.
export default function GuestSecurity() {
  const { toast } = useApp();

  // State variables for form inputs and status messages
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle form submission for changing the password
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    // Validate the current password, new password, and confirm password inputs
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    // Validate that the new password and confirm password fields match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    // Validate that the new password is different from the current password
    if (currentPassword === newPassword) {
      setError('Choose a different password.');
      return;
    }

    // Prevent multiple submissions while saving
    if (saving) return;

    try {
      setSaving(true);

      await send(
        '/guest/profile/password',
        'PATCH',
        { currentPassword, newPassword }
      );

      // Clear the form fields after a successful password change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast('Password updated successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to change your password.'
      );
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
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="guest-account-field">
          New Password
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="guest-account-field">
          Confirm New Password
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
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
          <p>Use a unique password with at least 8 characters.</p>
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
