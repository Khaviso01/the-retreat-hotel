
import { useEffect, useState, type FormEvent } from 'react';
import {
  UserRound,
  LockKeyhole,
  ShieldCheck,
  CalendarDays,
  Mail,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

import { api, send } from '../lib/api';
import { useApp } from '../context/AppContext';
import { AdminSidebar, Loading } from '../components/shared/Shared';

import '../styles.css';

// AdminProfile component allows administrators to view and update their personal information and account security settings.
type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  hasPassword: boolean;
};

// AdminProfile component allows administrators to view and update their personal information and account security settings.
export default function AdminProfile() {
  const { toast } = useApp();

  // State variables for managing the administrator's profile data and loading/saving states.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State variables for managing the administrator's name and password form visibility.
  const [name, setName] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // State to manage password fields for changing the account password.
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load the currently signed-in administrator.
  useEffect(() => {
    let active = true;

    // Fetch the administrator's profile data from the server and update the state accordingly.
    api<Profile>('/admin/profile')
      .then(data => {
        if (!active) return;
        setProfile(data);
        setName(data.name);
      })
      .catch(err => {
        if (active) {
          toast(err instanceof Error ? err.message : 'Unable to load profile.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

      // Cleanup function to prevent state updates if the component is unmounted before the API call completes.
    return () => {
      active = false;
    };
  }, []);

  // Compute the initials for the administrator's avatar based on their name.
  const initials = (profile?.name || 'Admin')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  // Save updated personal information.
  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || saving) return;

    // Validate the name input to ensure it meets the minimum length requirement.
    setSaving(true);

    try {
      const updated = await send<Profile>(
        '/admin/profile',
        'PATCH',
        { name: name.trim(), email: profile.email }
      );

      // Update the profile state with the new information and display a success message.
      setProfile(prev => prev ? { ...prev, ...updated } : prev);
      toast('Profile updated successfully.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Change account password.
  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate that the new password and confirm password fields match.
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast('New passwords do not match.');
      return;
    }

    // Validate that the new password meets the minimum length requirement.
    if (passwords.newPassword.length < 8) {
      toast('Password must contain at least 8 characters.');
      return;
    }

    // Prevent multiple submissions while saving.
    setSaving(true);

    try {
      await send(
        '/admin/profile/password',
        'PATCH',
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        }
      );

      // Clear the password fields and hide the password form after a successful password change.
      toast('Password changed successfully.');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main admin-profile-page">
        <div className="admin-profile-container">
          <header className="admin-profile-heading">
            <div>
              <span className="admin-profile-eyebrow">ACCOUNT SETTINGS</span>
              <h1>My Profile</h1>
              <p>Manage your personal information and account security.</p>
            </div>
          </header>

          {loading ? (
            <Loading />
          ) : !profile ? (
            <div className="admin-profile-card">
              <p>Unable to load your profile. Please refresh the page.</p>
            </div>
          ) : (
            <>
              {/* Profile hero */}
              <section className="admin-profile-hero">
                <div className="admin-profile-hero-avatar">
                  {initials}
                </div>

                <div className="admin-profile-hero-info">
                  <h2>{profile.name}</h2>
                  <p>{profile.email}</p>
                  <span className="admin-profile-role">
                    <ShieldCheck size={14} />
                    Administrator
                  </span>
                </div>
              </section>

              {/* Personal information */}
              <section className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <div className="admin-profile-section-icon">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h2>Personal Information</h2>
                    <p>Update the name associated with your account.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile}>
                  <div className="admin-profile-fields">
                    <label>
                      Full Name
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        minLength={2}
                        required
                        placeholder="Enter your full name"
                      />
                    </label>

                    <label>
                      Email Address
                      <div className="admin-profile-readonly">
                        <Mail size={17} />
                        <span>{profile.email}</span>
                      </div>
                    </label>
                  </div>

                  <p className="admin-profile-help">
                    Email changes require verification and are currently unavailable.
                  </p>

                  <div className="admin-profile-actions">
                    <button
                      type="submit"
                      className="admin-profile-primary"
                      disabled={saving || name.trim() === profile.name}
                    >
                      <Save size={17} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Account security */}
              <section className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <div className="admin-profile-section-icon">
                    <LockKeyhole size={20} />
                  </div>
                  <div>
                    <h2>Account Security</h2>
                    <p>Keep your administrator account protected.</p>
                  </div>
                </div>

                {!profile.hasPassword ? (
                  <p className="admin-profile-help">
                    This account uses Google sign-in. Password changes are not available.
                  </p>
                ) : !showPasswordForm ? (
                  <div className="admin-profile-security-row">
                    <div>
                      <strong>Password</strong>
                      <p>Update your password regularly to protect your account.</p>
                    </div>

                    <button
                      type="button"
                      className="admin-profile-secondary"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword}>
                    <div className="admin-profile-password-fields">
                      {([
                        ['currentPassword', 'Current Password'],
                        ['newPassword', 'New Password'],
                        ['confirmPassword', 'Confirm New Password']
                      ] as const).map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <div className="admin-profile-password-input">
                            <input
                              type={showPasswords ? 'text' : 'password'}
                              value={passwords[key]}
                              onChange={e => setPasswords(prev => ({
                                ...prev,
                                [key]: e.target.value
                              }))}
                              minLength={key === 'currentPassword' ? undefined : 8}
                              autoComplete={
                                key === 'currentPassword'
                                  ? 'current-password'
                                  : 'new-password'
                              }
                              required
                            />
                          </div>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="admin-profile-show-password"
                      onClick={() => setShowPasswords(v => !v)}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showPasswords ? 'Hide passwords' : 'Show passwords'}
                    </button>

                    <div className="admin-profile-actions">
                      <button
                        type="button"
                        className="admin-profile-secondary"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="admin-profile-primary"
                        disabled={saving}
                      >
                        {saving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Read-only account details */}
              <section className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <div className="admin-profile-section-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2>Account Details</h2>
                    <p>Information associated with your administrator account.</p>
                  </div>
                </div>

                <div className="admin-profile-detail">
                  <span><ShieldCheck size={17} /> Account Role</span>
                  <strong>Administrator</strong>
                </div>

                <div className="admin-profile-detail">
                  <span><CalendarDays size={17} /> Date Joined</span>
                  <strong>
                    {new Date(profile.createdAt).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                </div>

                <div className="admin-profile-detail">
                  <span>Account ID</span>
                  <code>{profile.id}</code>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
