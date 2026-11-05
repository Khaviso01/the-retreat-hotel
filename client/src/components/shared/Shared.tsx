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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Brand() {
  return (
    <Link className="brand" to="/">
      <span>The Retreat</span>
      <small>HOTELS & RESORTS</small>
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
  const { logout, confirm } = useApp();

  const handleSignOut = () => {
    confirm(
      'Are you sure you want to sign out of the admin dashboard?',
      () => {
        logout();
        navigate('/signed-out');
      }
    );
  };

  return (
    <>
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <Menu />
      </button>
      <aside className={'admin-sidebar ' + (open ? 'open' : '')}>
        <Brand />
        <div className="sidebar-caption">ADMINISTRATION</div>
        {adminLinks.map(([url, label, Icon]) => (
          <NavLink
            key={url}
            to={url}
            end={url === '/admin'}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          className="btn btn-admin-signout"
          onClick={handleSignOut}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
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
  return <span className={'status ' + value}>{value}</span>;
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