import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  ChartNoAxesCombined,
  Heart,
  House,
  LogOut,
  Menu,
  Settings,
  Users,
  Building2,
  Bell,
  Star,
  ClipboardList,
  ShieldCheck,
  UserRound,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RetreatLogo from '../../../assets/the-retreat-logo.png';

export function Brand() {
  return (
    <Link className="brand" to="/">
      <img src={RetreatLogo} alt="The Retreat Hotel" />
    </Link>
  );
}


export function GuestNav() {
  const { user } = useApp();

  return (
    <nav className="guest-nav">
      <Brand />

      <div className="nav-links">
        <NavLink to="/" end>
          <House size={18} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/branches">
          <Building2 size={18} />
          <span>Our Branches</span>
        </NavLink>

        <NavLink to="/bookings">
          <CalendarDays size={18} />
          <span>My Bookings</span>
        </NavLink>

        <NavLink to="/favourites">
          <Heart size={18} />
          <span>Favourites</span>
        </NavLink>

        <NavLink to="/notifications">
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>

        <NavLink to={user ? '/profile' : '/login'}>
          <span className="btn">{user ? 'Profile' : 'Sign In'}</span>
        </NavLink>
      </div>
    </nav>
  );
}


const adminLinks = [
  ['/admin', 'Dashboard', ChartNoAxesCombined],
  ['/admin/rooms', 'Rooms', BedDouble],
  ['/admin/bookings', 'Bookings', CalendarDays],
  ['/admin/branches', 'Branches', Building2],
  ['/admin/users', 'Users', Users],
  ['/admin/reviews', 'Reviews', Star],
  ['/admin/notifications', 'Notifications', Bell],
  ['/admin/reports', 'Reports', ClipboardList],
  ['/admin/settings', 'Settings', Settings],
] as const;


export function AdminSidebar() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  // Get the currently signed-in administrator.
  const { user, logout, confirm } = useApp();

  // Generate initials from the administrator's name.
  const initials = (user?.name || 'Admin')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(name => name.charAt(0).toUpperCase())
    .join('');

  // Confirm before signing out.
  const handleSignOut = () => {
    confirm(
      'Are you sure you want to sign out of the admin dashboard?',
      () => {
        logout();
        setOpen(false);
        navigate('/signed-out');
      }
    );
  };

  return (
    <>
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <Menu />
      </button>

      <aside className={'admin-sidebar ' + (open ? 'open' : '')}>

        {/* Sidebar header */}
        <div className="admin-sidebar-header">
          <Brand />
          <div className="sidebar-caption">
            ADMINISTRATION
          </div>
        </div>

        {/* Main navigation links */}
        <nav className="admin-sidebar-nav">
          {adminLinks.map(([url, label, Icon]) => (
            <NavLink
              key={url}
              to={url}
              end={url === '/admin'}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section: profile and sign out */}
        <div className="admin-sidebar-bottom">

          {/* Administrator profile */}

          {/* Clickable administrator profile */}
          <NavLink
            to="/admin/profile"
            className="admin-sidebar-profile"
            onClick={() => setOpen(false)}
            aria-label="Open administrator profile"
          >
            {/* Profile initials */}
            <div className="admin-profile-avatar">
              {initials}
            </div>

            {/* Profile details */}
            <div className="admin-profile-info">
              <strong>
                {user?.name || 'Administrator'}
              </strong>

              <span>Administrator</span>
            </div>

            {/* Arrow */}
            <ChevronRight
              size={18}
              className="admin-profile-arrow"
            />
          </NavLink>


          {/* Divider between profile and sign out */}
          <div className="admin-sidebar-divider" />

          {/* Sign out button */}
          <button
            type="button"
            className="btn-admin-signout"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>

        </div>
      </aside>
    </>
  );
}


export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="empty">
      <ShieldCheck size={30} />
      <p>{message}</p>
    </div>
  );
}

export function Loading() {
  return <div className="loading">Loading The Retreat...</div>;
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars">
      <Star size={15} fill="currentColor" /> {rating.toFixed(1)}
    </span>
  );
}

export function Status({ value }: { value: string }) {
  const statusClass = value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-');

  return (
    <span className={`status ${statusClass}`}>
      {value.replace(/[_-]/g, ' ')}
    </span>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/">
        <House />
        Home
      </NavLink>
      <NavLink to="/bookings">
        <CalendarDays />
        Bookings
      </NavLink>
      <NavLink to="/favourites">
        <Heart />
        Favourites
      </NavLink>
      <NavLink to="/profile">
        <Users />
        Profile
      </NavLink>
    </nav>
  );
}