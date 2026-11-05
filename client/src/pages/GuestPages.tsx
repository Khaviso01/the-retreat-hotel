import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowLeft, CheckCircle, Heart, Bell, LogOut, UserRound, Mail, Eye, EyeOff } from 'lucide-react';
import { api, send, money, type Branch, type Room, type Booking, type Notice, type Review
} from '../lib/api';
import { useApp } from '../context/AppContext';
import {
  GuestNav,
  BottomNav,
  PageTitle,
  Empty,
  Loading,
  Stars,
  Status,
} from '../components/shared/Shared';
import { HotelFacilities } from '../components/guest/HotelFacilities';
import { HotelPolicies } from '../components/guest/HotelPolicies';
import {
  SearchWidget,
  BranchCard,
  FavouriteButton,
  RoomCard,
  HotelGallery,
  BookingSummary,
  PaymentMethods,
  BookingCard,
  NotificationCard,
  ProfileLinks,
  ShareHotel,
} from '../components/guest/GuestComponents';

/**
 * Custom data-fetching hook for guest portal endpoints.
 */
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<T>(url)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [url]);

  return { data, error, reload: () => api<T>(url).then(setData) };
}

/**
 * Standard container wrapper including top navigation, main content slot, bottom navigation, and global footer.
 */
function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="guest-app">
      <GuestNav />
      {children}
      <BottomNav />
      <footer className="footer">
        The Retreat Hotels & Resorts • South Africa • © 2026
      </footer>
    </div>
  );
}

/**
 * Guest Landing Home Page View.
 */
export function Home() {
  const { data: branches } = useData<Branch[]>('/branches');

  const {
  data: reviews,
  error: reviewsError,
} = useData<Review[]>('/reviews');

  return (
    <Wrap>
      <section className="hero">
        <div className="hero-shade">
          <span className="eyebrow">THE RETREAT HOTELS & RESORTS</span>
          <h1>Find your perfect stay.</h1>
          <p>Relax. Explore. Belong. Discover exceptional stays across South Africa.</p>
        </div>
      </section>
      <div className="container home-search">
        <h2>Where would you like to stay?</h2>
        {branches && <SearchWidget branches={branches} />}
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow green">DISCOVER THE RETREAT</span>
            <h2>Our beautiful branches</h2>
          </div>
          <Link to="/branches">View all branches →</Link>
        </div>
        <div className="branch-grid">
          {branches?.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>
      </section>
      <section className="container promo">
        <h2>Unforgettable stays across South Africa.</h2>
        <p>Comfort, discovery and thoughtful hospitality — all in one place.</p>
        <Link className="btn" to="/branches">
          Explore Our Hotels
        </Link>
      </section>


{/* Guest reviews displayed on the landing page */}
<section className="container section home-reviews">
  <div className="section-heading">
    <div>
      <span className="eyebrow green">GUEST EXPERIENCES</span>
      <h2>What Our Guests Say</h2>
    </div>

    <Link to="/reviews">View all reviews →</Link>
  </div>

  {reviewsError ? (
    <p className="muted">Unable to load reviews right now.</p>
  ) : reviews === null ? (
    <Loading />
  ) : reviews.length > 0 ? (
    <div className="home-review-grid">
      {reviews.slice(0, 3).map((review) => (
        <article className="panel home-review-card" key={review.id}>
          <Stars rating={review.rating} />

          <p className="home-review-text">
            "{review.text}"
          </p>

          <div className="home-review-author">
            <strong>{review.user?.name ?? 'Guest'}</strong>

            {review.branch?.name && (
              <span className="muted">
                {review.branch.name}
              </span>
            )}

            {review.createdAt && (
              <small className="muted">
                {new Date(review.createdAt).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </small>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <p className="muted">
      No guest reviews yet. Be the first to share your experience!
    </p>
  )}
</section>

    </Wrap>
  );
}

/**
 * Branch Listing & Filter Search Page View.
 */

export function Branches() {
  const [params] = useSearchParams();
  const { data: branches } = useData<Branch[]>('/branches');

  const city = params.get('city') || '';
  const branchId = params.get('branch') || '';

  const searchQuery = params.toString();
  const hasRoomFilters = [
    'minPrice',
    'maxPrice',
    'roomType',
    'guests',
    'checkIn',
    'checkOut',
    'sort'
  ].some(key => params.has(key) && params.get(key) !== '');

  const [matchingRooms, setMatchingRooms] = useState<
    (Room & { branch: Branch })[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!hasRoomFilters) {
      setMatchingRooms([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    let active = true;

    const query = new URLSearchParams();

    // The backend searches location by city, name or address.
    if (city) query.set('location', city);

    for (const key of [
      'minPrice',
      'maxPrice',
      'roomType',
      'guests',
      'checkIn',
      'checkOut',
      'sort'
    ]) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }

    setSearching(true);
    setSearchError('');

    api<{
      count: number;
      rooms: (Room & { branch: Branch })[];
    }>(`/search?${query.toString()}`)
      .then(result => {
        if (active) {
          setMatchingRooms(result.rooms);
          setSearching(false);
        }
      })
      .catch(error => {
        if (active) {
          setSearchError(
            error instanceof Error ? error.message : 'Search failed.'
          );
          setSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [searchQuery, hasRoomFilters, city]);

  const filtered = branches?.filter(b => {
    if (city && b.city !== city) return false;
    if (branchId && b.id !== branchId) return false;

    if (hasRoomFilters) {
      return matchingRooms.some(room => room.branchId === b.id);
    }

    return true;
  });

  return (
    <Wrap>
      <main className="container section">
        <PageTitle
          title="Explore Our Hotels"
          subtitle={
            city
              ? `Showing stays in ${city}`
              : 'Discover all The Retreat destinations'
          }
        />

        {searching ? (
          <Loading />
        ) : searchError ? (
          <p className="error" role="alert">{searchError}</p>
        ) : (
          <>
            <p className="muted">
              {filtered?.length ?? 0} matching hotel(s)
            </p>

            <div className="branch-grid">
              {filtered?.map(b => (
                <BranchCard key={b.id} branch={b} />
              ))}
            </div>

            {filtered?.length === 0 && (
              <Empty message="No hotels match your search. Try adjusting your filters." />
            )}
          </>
        )}
      </main>
    </Wrap>
  );
}


/**
 * Individual Hotel Branch Details & Room Selection Page View.
 */
export function HotelDetails() {
  const { id } = useParams();
  const { data: b } = useData<Branch>('/branches/' + id);
  const { data: rooms } = useData<Room[]>('/rooms?branchId=' + id);
  const navigate = useNavigate();

  return (
    <Wrap>
      {!b ? (
        <Loading />
      ) : (
        <>
          <div className="container section">
            <Link className="back" to="/branches">
              <ArrowLeft size={17} /> Back to Hotels
            </Link>
            <HotelGallery branch={b} />
            <div className="hotel-header">
              <div>
                <h1>{b.name}</h1>
                <p>
                  <MapPin size={16} />
                  {b.address}
                </p>
                <Stars rating={b.rating} />
              </div>
              <div className="actions">
                <ShareHotel branch={b} />
                <FavouriteButton branchId={b.id} />
              </div>
            </div>
            <div className="hotel-content">
              <div>
                <h2>Welcome to {b.name}</h2>
                <p>{b.description}</p>
                <h3>Facilities & Amenities</h3>
                <HotelFacilities items={b.amenities} />
                <HotelPolicies items={b.policies ?? []} />
                <h3>Location</h3>
                <div className="location-card">
                  <MapPin />
                  <div>
                    {b.address}
                    <p>
                      <a
                        href={
                          'https://www.google.com/maps/search/?api=1&query=' +
                          encodeURIComponent(b.address)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get Directions ↗
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <aside className="details-aside">
                <h3>Choose your room</h3>
                <p>Flexible room options for your next stay.</p>
                <a href="#rooms" className="btn">
                  View Available Rooms
                </a>
              </aside>
            </div>
            <div id="rooms" className="section">
              <h2>Select a Room</h2>
              <div className="room-list">
                {rooms?.map((r) => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    choose={(room) => navigate('/checkout/' + room.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Wrap>
  );
}

/**
 * Room Reservation Checkout & Booking Form Page View.
 */

export function Checkout() {
  const { id } = useParams();
  const { data: room } = useData<Room>('/rooms/' + id);
  const { user, toast } = useApp();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [busy, setBusy] = useState(false);

  // Keep a created booking so a failed payment initialization
  // doesn't create a second reservation on retry.
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast('Sign in to complete your booking.');
      navigate('/login?next=' + encodeURIComponent('/checkout/' + id));
      return;
    }

    if (busy) return;

    setBusy(true);

    try {
      let bookingId = pendingBookingId;

      // Step 1: Create a booking if one hasn't been created yet.
      if (!bookingId) {
        const booking = await send<Booking>('/bookings', 'POST', {
          roomId: id,
          checkIn,
          checkOut,
          guests,
        });

        bookingId = booking.id;
        setPendingBookingId(bookingId);
      }

      // Step 2: Initialize payment through our Express backend.
      const payment = await send<{
        bookingId: string;
        reference: string;
        authorizationUrl: string;
      }>('/payments/initialize', 'POST', {
        bookingId,
      });

      if (!payment.authorizationUrl) {
        throw new Error('Paystack did not return a payment URL.');
      }

      // Step 3: Redirect to Paystack's hosted checkout.
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Unable to start payment. Please try again.'
      );
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <main className="container section">
        <PageTitle
          title="Complete Your Booking"
          subtitle="Review your stay and proceed to secure payment"
        />

        {!room ? (
          <Loading />
        ) : (
          <form className="checkout-grid" onSubmit={submit}>
            <div className="panel">
              <h2>Guest & Stay Details</h2>

              <div className="form-grid">
                <label>
                  Check-in
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={checkIn}
                    disabled={busy || !!pendingBookingId}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </label>

                <label>
                  Check-out
                  <input
                    type="date"
                    required
                    min={checkIn || new Date().toISOString().slice(0, 10)}
                    value={checkOut}
                    disabled={busy || !!pendingBookingId}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>

                <label>
                  Guests
                  <input
                    type="number"
                    min="1"
                    max={room.capacity}
                    required
                    value={guests}
                    disabled={busy || !!pendingBookingId}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="btn wide"
                disabled={busy}
              >
                {busy ? 'Redirecting to Paystack...' : 'Proceed to Secure Payment'}
              </button>

              <p className="muted">
                You will be redirected to Paystack to complete your
                payment securely. Your booking will be confirmed
                after successful payment verification.
              </p>
            </div>

            <BookingSummary
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
            />
          </form>
        )}
      </main>
    </Wrap>
  );
}


/**
 * Booking Submission Confirmation Screen.
 */

export function Confirmation() {
  const { id } = useParams();
  const { data: booking } = useData<Booking>(
    '/bookings/' + id
  );
  const navigate = useNavigate();

  if (!booking) {
    return (
      <Wrap>
        <main className="container section">
          <Loading />
        </main>
      </Wrap>
    );
  }

  const paid = booking.paymentStatus === 'success';
  const confirmed = booking.status === 'confirmed';
  const cancelled = booking.status === 'cancelled';

  return (
    <Wrap>
      <main className="container section">
        <div
          className="panel"
          style={{
            maxWidth: 650,
            margin: '40px auto',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <h1>
            {cancelled
              ? 'Booking Cancelled'
              : paid && confirmed
                ? 'Booking Confirmed!'
                : 'Booking Pending'}
          </h1>

          <p className="muted">
            {cancelled
              ? 'This reservation has been cancelled.'
              : paid && confirmed
                ? 'Your payment was successful and your reservation is confirmed.'
                : 'Your reservation is awaiting payment or confirmation.'}
          </p>

          <div style={{ margin: '28px 0', textAlign: 'left' }}>
            <p><strong>Booking Reference:</strong> {booking.id}</p>
            <p><strong>Check-in:</strong> {booking.checkIn}</p>
            <p><strong>Check-out:</strong> {booking.checkOut}</p>
            <p><strong>Guests:</strong> {booking.guests}</p>
            <p><strong>Total:</strong> R{booking.total.toLocaleString()}</p>
            <p>
              <strong>Booking Status:</strong>{' '}
              {booking.status.toUpperCase()}
            </p>
            <p>
              <strong>Payment Status:</strong>{' '}
              {(booking.paymentStatus || 'pending').toUpperCase()}
            </p>
          </div>

          <button
            className="btn"
            onClick={() => navigate('/bookings')}
          >
            View My Bookings
          </button>
        </div>
      </main>
    </Wrap>
  );
}


/**
 * Guest Reservations List Page View.
 */
export function Bookings() {
  const { user } = useApp();
  const { data: bookings } = useData<Booking[]>('/bookings');
  const { data: rooms } = useData<Room[]>('/rooms');

  return (
    <Wrap>
      <main className="container section">
        <PageTitle
          title="My Bookings"
          subtitle="Your upcoming and previous reservations"
        />
        {!user ? (
          <Empty message="Sign in to see your bookings." />
        ) : bookings?.length ? (
          <div className="booking-list">
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                room={rooms?.find((r) => r.id === b.roomId)}
              />
            ))}
          </div>
        ) : (
          <Empty message="No bookings yet. Explore our hotels to get started." />
        )}
      </main>
    </Wrap>
  );
}

/**
 * Individual Reservation Details View.
 */
export function BookingDetails() {
  const { id } = useParams();
  const { data: b, reload } = useData<Booking>('/bookings/' + id);
  const { data: rooms } = useData<Room[]>('/rooms');
  const { confirm, toast } = useApp();

  const room = rooms?.find((r) => r.id === b?.roomId);

  return (
    <Wrap>
      <main className="container section">
        <PageTitle title="Booking Details" subtitle={id} />
        {!b ? (
          <Loading />
        ) : (
          <div className="panel booking-detail">
            {room && <img src={room.image} alt={room.name} />}
            <div className="flex-between">
              <h2>{room?.name || 'Your Room'}</h2>
              <Status value={b.status} />
            </div>
            <p>
              Booking Reference: <strong>{b.id}</strong>
            </p>
            <p>
              Check-in: <strong>{b.checkIn}</strong>
            </p>
            <p>
              Check-out: <strong>{b.checkOut}</strong>
            </p>
            <p>
              Guests: <strong>{b.guests}</strong>
            </p>
            <h3>Total: {money(b.total)}</h3>
            {b.status !== 'cancelled' && (
              <button
                className="btn danger"
                onClick={() =>
                  confirm(
                    'Cancel this reservation? This cannot be undone.',
                    async () => {
                      await send('/bookings/' + b.id, 'PATCH', {
                        status: 'cancelled',
                      });
                      toast('Booking cancelled.');
                      reload();
                    }
                  )
                }
              >
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </main>
    </Wrap>
  );
}

/**
 * Saved Favourites List Page View.
 */
export function Favourites() {
  const { user } = useApp();
  const { data } = useData<Branch[]>('/favourites');

  return (
    <Wrap>
      <main className="container section">
        <PageTitle title="My Favourites" subtitle="Hotels you have saved" />
        {!user ? (
          <Empty message="Sign in to save your favourite hotels." />
        ) : (
          <div className="branch-grid">
            {data?.map((b) => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        )}
        {user && data?.length === 0 && <Empty message="No favourites yet." />}
      </main>
    </Wrap>
  );
}

/**
 * User Notifications Feed Page View.
 */
export function Notifications() {
  const { user, toast } = useApp();
  const { data, reload } = useData<Notice[]>('/notifications');

  return (
    <Wrap>
      <main className="container section">
        <PageTitle
          title="Notifications"
          subtitle="Your latest booking updates"
        />
        {!user ? (
          <Empty message="Sign in to see notifications." />
        ) : data?.length ? (
          <div className="notification-list">
            {data.map((n) => (
              <NotificationCard
                key={n.id}
                notice={n}
                onRead={async () => {
                  try {
                    await send('/notifications/' + n.id + '/read', 'PATCH');
                    reload();
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Empty message="No notifications yet." />
        )}
      </main>
    </Wrap>
  );
}

/**
 * Guest Profile Dashboard Page View.
 */
export function Profile() {
  const { user, confirm, logout } = useApp();
  const navigate = useNavigate();

  return (
    <Wrap>
      <main className="container section profile-page">
        <PageTitle title="My Profile" subtitle="Manage your account" />
        <div className="panel">
          <div className="avatar">{user?.name?.[0] || 'G'}</div>
          <h2>{user?.name || 'Guest'}</h2>
          <p>{user?.email || 'Sign in to access your profile'}</p>
          {user ? (
            <>
              <ProfileLinks />
              <button
                className="btn danger"
                onClick={() =>
                  confirm('Are you sure you want to sign out?', () => {
                    logout();
                    navigate('/signed-out');
                  })
                }
              >
                <LogOut size={16} /> Sign Out
              </button>
            </>
          ) : (
            <Link className="btn" to="/login">
              Sign In
            </Link>
          )}
        </div>
      </main>
    </Wrap>
  );
}

/**
 * Guest Authentication (Login / Signup) Form Page View.
 */
export function Login() {
  const { login, register, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [signup, setSignup] = useState(false);
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
  e.preventDefault();
  setError('');

  // Validate passwords only during Sign Up
  if (signup && password !== confirmPassword) {
    setError('Passwords do not match.');
    return;
  }

  try {
      const u = signup
        ? await register(name, email, password)
        : await login(email, password);
      toast('Successfully signed in!');
      navigate(
        u.role === 'admin'
          ? '/admin'
          : params.get('next') || '/signin-success'
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleGoogleLogin = () => {
    const next = params.get('next') || '/signin-success';

    const callback = new URLSearchParams({
      next,
    });

    window.location.href =
      `${import.meta.env.VITE_API_URL}/auth/google?${callback.toString()}`;
  };

  return (
    <Wrap>
      <main className="auth-page">
        <form className="auth-card" onSubmit={submit}>
          <h1>The Retreat</h1>
          <small>HOTELS & RESORTS</small>
          <h2>{signup ? 'Create Account' : 'Welcome Back'}</h2>
          <div className="auth-tabs">
            <button
              type="button"
              className={!signup ? 'active' : ''}
              onClick={() => setSignup(false)}
            >
              Log In
            </button>
            <button
              type="button"
              className={signup ? 'active' : ''}
              onClick={() => setSignup(true)}
            >
              Sign Up
            </button>
          </div>
          {signup && (
            <label>
              Full Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={signup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </label>


{/* Confirm Password - Sign Up only */}
{signup && (
  <label>
    Confirm Password

    <div className="password-input-wrapper">
      <input
        type={showConfirmPassword ? 'text' : 'password'}
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        placeholder="Confirm your password"
      />

      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        aria-label={
          showConfirmPassword
            ? 'Hide confirm password'
            : 'Show confirm password'
        }
        aria-pressed={showConfirmPassword}
      >
        {showConfirmPassword ? (
          <EyeOff size={20} />
        ) : (
          <Eye size={20} />
        )}
      </button>
    </div>
  </label>
)}



          {/* Only show Forgot Password on Login, not Sign Up */}
          {!signup && (
            <div className="forgot-password-wrapper">
              <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
              </Link>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          <button className="btn wide">
            {signup ? 'Create Account' : 'Log In'}
          </button>
          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt=""
              width="20"
              height="20"
            />
            Continue with Google
          </button>
        </form>
      </main>
    </Wrap>
  );
}

/**
 * Authentication Action Success View.
 */
export function AuthSuccess({ signedOut = false }: { signedOut?: boolean }) {
  return (
    <Wrap>
      <main className="container section">
        <div className="success-page">
          <CheckCircle size={78} />
          <h1>
            {signedOut ? 'Successfully Signed Out' : 'Successfully Signed In!'}
          </h1>
          <p>
            {signedOut
              ? 'We hope to see you again soon.'
              : 'Welcome back to The Retreat.'}
          </p>
          <Link className="btn" to={signedOut ? '/' : '/profile'}>
            {signedOut ? 'Back to Home' : 'Continue to Profile'}
          </Link>
        </div>
      </main>
    </Wrap>
  );
}

/**
 * Hotel Reviews Feed & Submission View.
 */
export function Reviews() {
  const { data, reload } = useData<Review[]>('/reviews');
  const { user, toast } = useApp();
  const { data: branches } = useData<Branch[]>('/branches');

  const [branchId, setBranchId] = useState('cape-town');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  return (
    <Wrap>
      <main className="container section">
        <PageTitle title="Guest Reviews" subtitle="Share your experience" />
        <div className="panel">
          <h2>Write a Review</h2>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) {
                toast('Sign in to write a review.');
                return;
              }
              try {
               await send('/reviews', 'POST', { branchId, rating, text });
toast('Review submitted!');
setText('');
await reload();
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          >
            <label>
              Hotel
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches?.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Your Review
              <textarea
                minLength={5}
                required
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="btn">Submit Review</button>
          </form>
        </div>
        <div className="review-list">
          {data?.map((r) => (
            <div className="panel" key={r.id}>
              <Stars rating={r.rating} />
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </main>
    </Wrap>
  );
}