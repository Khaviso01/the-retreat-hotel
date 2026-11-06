
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Heart,
  LockKeyhole,
  LogOut,
  Star,
  UserRound,
} from 'lucide-react';
import '../../styles.css';

type GuestProfileDashboardProps = {
  name: string;
  email: string;
  onSignOut: () => void;
};

const quickLinks = [
  {
    title: 'My Bookings',
    description: 'Manage your reservations',
    path: '/bookings',
    icon: CalendarDays,
  },
  {
    title: 'My Favourites',
    description: 'Your saved hotel branches',
    path: '/favourites',
    icon: Heart,
  },
  {
    title: 'Notifications',
    description: 'Latest booking updates',
    path: '/notifications',
    icon: Bell,
  },
  {
    title: 'Guest Reviews',
    description: 'View and share experiences',
    path: '/reviews',
    icon: Star,
  },
];

export function GuestProfileDashboard({
  name,
  email,
  onSignOut,
}: GuestProfileDashboardProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'G';

  return (
    <div className="guest-profile-dashboard">
      {/* Guest identity header */}
      <header className="guest-profile-hero">
        <div className="guest-profile-avatar" aria-hidden="true">
          {initials}
        </div>

        <div className="guest-profile-identity">
          <span className="guest-profile-eyebrow">
            THE RETREAT ACCOUNT
          </span>
          <h2>{name}</h2>
          <p>{email}</p>
          <span className="guest-profile-role">Guest account</span>
        </div>
      </header>

      {/* Quick access */}
      <section className="guest-profile-section">
        <div className="guest-profile-section-heading">
          <h2>My Dashboard</h2>
          <p>Everything you need for your next stay.</p>
        </div>

        <div className="guest-profile-grid">
          {quickLinks.map(({ title, description, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="guest-profile-quick-card"
            >
              <div className="guest-profile-card-icon">
                <Icon size={23} />
              </div>

              <div className="guest-profile-card-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>

              <ChevronRight
                size={19}
                className="guest-profile-card-arrow"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Account options */}
      <section className="guest-profile-section">
        <div className="guest-profile-section-heading">
          <h2>Account Settings</h2>
          <p>Manage your personal details and account security.</p>
        </div>

        <div className="guest-profile-settings">
          <Link to="/profile/personal-info" className="guest-profile-setting">
            <span className="guest-profile-setting-icon">
              <UserRound size={20} />
            </span>
            <span className="guest-profile-setting-copy">
              <strong>Personal Information</strong>
              <small>View and update your details</small>
            </span>
            <ChevronRight size={19} />
          </Link>

          <Link to="/profile/security" className="guest-profile-setting">
            <span className="guest-profile-setting-icon">
              <LockKeyhole size={20} />
            </span>
            <span className="guest-profile-setting-copy">
              <strong>Password & Security</strong>
              <small>Manage your account security</small>
            </span>
            <ChevronRight size={19} />
          </Link>

          <button
            type="button"
            className="guest-profile-setting guest-profile-signout"
            onClick={onSignOut}
          >
            <span className="guest-profile-setting-icon">
              <LogOut size={20} />
            </span>
            <span className="guest-profile-setting-copy">
              <strong>Sign Out</strong>
              <small>Securely leave your account</small>
            </span>
            <ChevronRight size={19} />
          </button>
        </div>
      </section>
    </div>
  );
}
