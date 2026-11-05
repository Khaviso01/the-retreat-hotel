import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Heart,
  MapPin,
  Search,
  Share2,
  Users,
  Wifi,
  Waves,
  Coffee,
  Dumbbell,
  Bell,
  CheckCircle,
  ChevronRight,
  Star,
  Building2
} from 'lucide-react';
import { api, send, money, type Branch, type Room, type Booking, type Notice } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Stars, Status } from '../shared/Shared';

// Guest component 1: city, hotel, date, and guest search form.

export function SearchWidget({ branches }: { branches: Branch[] }) {
  const navigate = useNavigate();

  const [city, setCity] = useState('');
  const [branch, setBranch] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [roomType, setRoomType] = useState('');
  const [sort, setSort] = useState('price_asc');
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-CA');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (Boolean(checkIn) !== Boolean(checkOut)) {
      setError('Please select both check-in and check-out dates.');
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }

    if (
      minPrice !== '' &&
      maxPrice !== '' &&
      Number(minPrice) > Number(maxPrice)
    ) {
      setError('Maximum price must be greater than minimum price.');
      return;
    }

    const params = new URLSearchParams({
      city,
      branch,
      checkIn,
      checkOut,
      guests: String(guests),
      rooms: String(rooms),
      minPrice,
      maxPrice,
      roomType,
      sort
    });

    navigate(`/branches?${params.toString()}`);
  };

  return (
    <form className="search-widget" onSubmit={submit}>
      <label>
        <span>City</span>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setBranch('');
          }}
        >
          <option value="">All Cities</option>
          {[...new Set(branches.map((b) => b.city))].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Select a Hotel</span>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value="">All Hotels</option>
          {branches
            .filter((b) => !city || b.city === city)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
      </label>

      <label>
        <span>Check-in</span>
        <input
          aria-label="Check-in"
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => {
            setCheckIn(e.target.value);
            if (checkOut && e.target.value >= checkOut) {
              setCheckOut('');
            }
          }}
        />
      </label>

      <label>
        <span>Check-out</span>
        <input
          aria-label="Check-out"
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </label>

      <label className="compact">
        <span>Guests / Rooms</span>
        <div className="two-inputs">
          <input
            aria-label="Guests"
            type="number"
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
          <input
            aria-label="Rooms"
            type="number"
            min={1}
            max={5}
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
          />
        </div>
      </label>

      <label>
        <span>Minimum Price (R)</span>
        <input
          type="number"
          min="0"
          placeholder="Any minimum"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
      </label>

      <label>
        <span>Maximum Price (R)</span>
        <input
          type="number"
          min="0"
          placeholder="Any maximum"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </label>

      <label>
        <span>Room Type</span>
        <input
          type="text"
          placeholder="e.g. Deluxe, Suite"
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
        />
      </label>

      <label>
        <span>Sort By</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Highest Rated</option>
        </select>
      </label>

      {error && <p role="alert">{error}</p>}

      <button className="btn" type="submit">
        <Search size={17} /> Find Hotels
      </button>
    </form>
  );
}


// Guest component 2: photographic branch card.
export function BranchCard({ branch }: { branch: Branch }) {
  return (
    <article className="branch-card">
      <Link to={'/branches/' + branch.id}>
        <img src={branch.image} alt={branch.name} />
      </Link>
      <div className="branch-body">
        <div className="flex-between">
          <Stars rating={branch.rating} />
          <FavouriteButton branchId={branch.id} />
        </div>
        <h3>{branch.name}</h3>
        <p>
          <MapPin size={14} />
          {branch.address}
        </p>
        <Link className="btn small" to={'/branches/' + branch.id}>
          Explore Hotel <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}

// Guest component 3: toggle favourite via authenticated API.
export function FavouriteButton({ branchId }: { branchId: string }) {
  const { user, toast } = useApp();
  const [active, setActive] = useState(false);

  const click = async () => {
    if (!user) {
      toast('Sign in to save your favourites.');
      return;
    }
    try {
      await send('/favourites/' + branchId, active ? 'DELETE' : 'POST');
      setActive(!active);
      toast(active ? 'Removed from favourites.' : 'Added to favourites!');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <button
      aria-label="Toggle favourite"
      className={'heart-btn ' + (active ? 'liked' : '')}
      onClick={click}
    >
      <Heart size={20} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

// Guest component 4: selectable room card.
export function RoomCard({ room, choose }: { room: Room; choose: (room: Room) => void }) {
  return (
    <article className="room-card">
      <img src={room.image} alt={room.name} />
      <div>
        <h3>{room.name}</h3>
        <p>{room.description}</p>
        <span className="muted">
          <Users size={15} /> Up to {room.capacity} guests
        </span>
        <strong>
          {money(room.price)}
          <small> / night</small>
        </strong>
        <button
          className="btn small"
          disabled={!room.available}
          onClick={() => choose(room)}
        >
          {room.available ? 'Select Room' : 'Unavailable'}
        </button>
      </div>
    </article>
  );
}

// Guest component 5: hotel amenities.
export function Amenities({ items }: { items: string[] }) {
  const icons = [Wifi, Waves, Coffee, Dumbbell];
  return (
    <div className="amenities">
      {items.map((a, i) => {
        const Icon = icons[i % icons.length];
        return (
          <span key={a}>
            <Icon size={20} />
            {a}
          </span>
        );
      })}
    </div>
  );
}

// Guest component 6: image gallery, with replaceable image URLs.
export function HotelGallery({ branch }: { branch: Branch }) {
  return (
    <div className="gallery">
      <img src={branch.image} alt={branch.name} />
      <img
        src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80"
        alt="Hotel room"
      />
      <img
        src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
        alt="Resort pool"
      />
    </div>
  );
}

// Guest component 7: booking summary before checkout.
export function BookingSummary({
  room,
  checkIn,
  checkOut,
  guests,
}: {
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const nights = Math.max(
    1,
    Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000) || 1
  );

  return (
    <div className="summary">
      <h3>Booking Details</h3>
      <div className="flex-between">
        <span>{room.name}</span>
        <strong>{money(room.price)}/night</strong>
      </div>
      <div className="flex-between">
        <span>Check-in</span>
        <b>{checkIn}</b>
      </div>
      <div className="flex-between">
        <span>Check-out</span>
        <b>{checkOut}</b>
      </div>
      <div className="flex-between">
        <span>Guests</span>
        <b>{guests}</b>
      </div>
      <hr />
      <div className="flex-between">
        <span>
          {money(room.price)} × {nights} nights
        </span>
        <b>{money(room.price * nights)}</b>
      </div>
      <div className="flex-between">
        <span>Service fee</span>
        <b>R150</b>
      </div>
      <hr />
      <div className="flex-between total">
        <span>Total</span>
        <strong>{money(room.price * nights + 150)}</strong>
      </div>
    </div>
  );
}

// Guest component 8: payment method selection (demo only).
export function PaymentMethods({
  method,
  setMethod,
}: {
  method: string;
  setMethod: (v: string) => void;
}) {
  return (
    <div className="payment-methods">
      <h3>Select Payment Method</h3>
      {['Card (demo)', 'PayFast (demo)', 'Apple Pay (demo)', 'Google Pay (demo)'].map((m) => (
        <label key={m}>
          <input
            type="radio"
            name="payment"
            checked={method === m}
            onChange={() => setMethod(m)}
          />
          {m}
        </label>
      ))}
      <p className="muted">Demo checkout only. No real payment is collected.</p>
    </div>
  );
}

// Guest component 9: booking list item.
export function BookingCard({ booking, room }: { booking: Booking; room?: Room }) {
  return (
    <article className="booking-card">
      <img src={room?.image} alt="Reserved room" />
      <div>
        <h3>{room?.name || 'Room'}</h3>
        <p>
          {booking.checkIn} → {booking.checkOut}
        </p>
        <p>
          {booking.guests} guests • {money(booking.total)}
        </p>
        <Status value={booking.status} />
        <Link className="btn outline small" to={'/bookings/' + booking.id}>
          View Details
        </Link>
      </div>
    </article>
  );
}

// Guest component 10: individual notification.
export function NotificationCard({
  notice,
  onRead,
}: {
  notice: Notice;
  onRead: () => void;
}) {
  return (
    <article className={'notification ' + (!notice.read ? 'unread' : '')}>
      <Bell size={22} />
      <div>
        <h3>{notice.title}</h3>
        <p>{notice.message}</p>
        <small>{new Date(notice.createdAt).toLocaleString()}</small>
      </div>
      {!notice.read && (
        <button className="text-btn" onClick={onRead}>
          Mark read
        </button>
      )}
    </article>
  );
}

// Guest component 11: profile shortcut list.

export function ProfileLinks() {
  const links = [
    {
      to: '/bookings',
      label: 'View Bookings',
      icon: CalendarDays,
    },
    {
      to: '/favourites',
      label: 'Favourites',
      icon: Heart,
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      to: '/branches',
      label: 'Branches',
      icon: Building2,
    },
  ];

  return (
    <div className="profile-links">
      {links.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to}>
          <span className="profile-link-left">
            <Icon size={20} />
            <span>{label}</span>
          </span>

          <ChevronRight size={20} />
        </Link>
      ))}
    </div>
  );
}


// Guest component 12: sharing button.
export function ShareHotel({ branch }: { branch: Branch }) {
  const { toast } = useApp();

  return (
    <button
      className="icon-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast('Hotel link copied!');
        } catch {
          toast('Copy the URL from your browser.');
        }
      }}
    >
      <Share2 size={18} /> Share
    </button>
  );
}