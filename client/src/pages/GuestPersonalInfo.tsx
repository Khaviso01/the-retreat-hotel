
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Save, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { send, type User } from '../lib/api';

// GuestPersonalInfo component allows users to update their personal information, such as name and email.
export default function GuestPersonalInfo() {
  const { user, setUser, toast } = useApp();

  // State variables for form inputs and status messages
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Use useEffect to update the name state when the user object changes
  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  // Handle form submission for updating personal information
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    // Validate the name input to ensure it meets the minimum length requirement
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('Full name must contain at least 2 characters.');
      return;
    }

    if (!user || saving) return;

    // Proceed with sending the update request to the server
    try {
      setSaving(true);

      const updated = await send<User>(
        '/guest/profile',
        'PATCH',
        { name: trimmedName }
      );

      // Update global context and the persisted session.
      const nextUser = { ...user, ...updated };

      setUser(nextUser);
      localStorage.setItem('retreat_user', JSON.stringify(nextUser));

      toast('Personal information updated successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update your information.'
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
        <h1>Personal Information</h1>
        <p>Keep your account details up to date.</p>
      </div>

      <form className="guest-account-card" onSubmit={handleSubmit}>
        <div className="guest-account-card-heading">
          <span className="guest-account-icon">
            <UserRound size={22} />
          </span>
          <div>
            <h2>Profile Details</h2>
            <p>Manage your personal information.</p>
          </div>
        </div>

        <label className="guest-account-field">
          Full Name
          <input
            type="text"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
          />
        </label>

        <label className="guest-account-field">
          Email Address
          <div className="guest-account-readonly">
            <Mail size={18} />
            <span>{user?.email ?? ''}</span>
          </div>
          <small>Your email address cannot be changed here.</small>
        </label>

        {error && (
          <p className="guest-account-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn"
          disabled={
            saving ||
            !user ||
            name.trim() === user.name.trim()
          }
        >
          <Save size={17} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </main>
  );
}
