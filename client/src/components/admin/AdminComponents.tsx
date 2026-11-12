import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  Building2,
  Users,
  Wallet,
  CheckCircle,
  Search,
  Trash2,
  Edit3,
  Plus,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { money, type Stats, type Room, type Branch, type Booking, type User } from '../../lib/api';
import { Status } from '../shared/Shared';

// Admin component 1: KPI summary cards.
export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    ['Total Bookings', stats.bookings, CalendarDays],
    ['Total Revenue', money(stats.revenue), Wallet],
    ['Total Rooms', stats.rooms, BedDouble],
    ['Total Branches', stats.branches, Building2],
    ['Registered Users', stats.users, Users],
    ['Occupancy Indicator', stats.occupancy + '%', BarChart3],
  ] as const;

  return (
    <div className="stats-grid">
      {cards.map(([label, value, Icon]) => (
        <article className="stat" key={label}>
          <Icon size={22} />
          <p>{label}</p>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}

// Admin component 2: search bar.
export function AdminSearch({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="admin-search">
      <Search size={18} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// Admin component 3: rooms table with edit and delete controls.
export function RoomsTable({
  rooms,
  branches,
  onEdit,
  onDelete,
}: {
  rooms: Room[];
  branches: Branch[];
  onEdit: (r: Room) => void;
  onDelete: (r: Room) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Room</th>
            <th>Branch</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Price / night</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="table-name">
                  <img src={r.image} alt="" />
                  {r.name}
                </span>
              </td>
              <td>{branches.find((b) => b.id === r.branchId)?.city}</td>
              <td>{r.type}</td>
              <td>{r.capacity} guests</td>
              <td>{money(r.price)}</td>
              <td>
                <Status value={r.available ? 'available' : 'unavailable'} />
              </td>
              <td>
                <button
                  className="table-action"
                  title="Edit room"
                  onClick={() => onEdit(r)}
                >
                  <Edit3 size={17} />
                </button>
                <button
                  className="table-action red"
                  title="Delete room"
                  onClick={() => onDelete(r)}
                >
                  <Trash2 size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Admin component 4: fully editable add/edit room form.
export function RoomForm({
  branches,
  initial,
  onSave,
  onCancel,
}: {
  branches: Branch[];
  initial?: Room | null;
  onSave: (v: Omit<Room, 'id'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Omit<Room, 'id'>>({
    branchId: initial?.branchId || branches[0]?.id || '',
    name: initial?.name || '',
    type: initial?.type || 'Deluxe',
    capacity: initial?.capacity || 2,
    price: initial?.price || 1850,
    available: initial?.available ?? true,
    image: initial?.image || '',
    description: initial?.description || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof v, value: unknown) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>
        Room Name
        <input
          required
          value={v.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
      <label>
        Branch
        <select
          value={v.branchId}
          onChange={(e) => set('branchId', e.target.value)}
        >
          {branches.map((b) => (
            <option value={b.id} key={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Room Type
        <select
          value={v.type}
          onChange={(e) => set('type', e.target.value)}
        >
          {['Deluxe', 'Executive', 'Family', 'Suite', 'Standard'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Capacity
        <input
          type="number"
          min="1"
          required
          value={v.capacity}
          onChange={(e) => set('capacity', Number(e.target.value))}
        />
      </label>
      <label>
        Price per Night (R)
        <input
          type="number"
          min="1"
          required
          value={v.price}
          onChange={(e) => set('price', Number(e.target.value))}
        />
      </label>
      <label>
        Availability
        <select
          value={String(v.available)}
          onChange={(e) => set('available', e.target.value === 'true')}
        >
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
      </label>
      <label className="full">
        Room Image URL
        <input
          type="url"
          placeholder="https://images.unsplash.com/..."
          value={v.image}
          onChange={(e) => set('image', e.target.value)}
        />
      </label>
      <label className="full">
        Description
        <textarea
          rows={4}
          value={v.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </label>
      {v.image && (
        <img className="form-preview" src={v.image} alt="Room preview" />
      )}
      {error && <p className="error full">{error}</p>}
      <div className="actions full">
        <button type="button" className="btn outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn" disabled={busy}>
          {busy ? 'Saving...' : initial ? 'Save Changes' : 'Add Room'}
        </button>
      </div>
    </form>
  );
}

// Admin component 5: booking management table.
export function BookingsTable({
  bookings,
  rooms,
  onStatus,
}: {
  bookings: Booking[];
  rooms: Room[];
  onStatus: (b: Booking, status: Booking['status']) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Room</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Guests</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>
                {rooms.find((r) => r.id === b.roomId)?.name || 'Room removed'}
              </td>
              <td>{b.checkIn}</td>
              <td>{b.checkOut}</td>
              <td>{b.guests}</td>
              <td>{money(b.total)}</td>
              <td>
                <Status value={b.status} />
              </td>
              
<td>
  <div className="table-actions">
    {b.status === 'pending' && (
      <button
        className="table-action"
        onClick={() => onStatus(b, 'confirmed')}
      >
        <CheckCircle size={17} />
        Approve
      </button>
    )}

    {b.status !== 'cancelled' && (
      <button
        className="table-action red"
        onClick={() => onStatus(b, 'cancelled')}
      >
        Cancel
      </button>
    )}
  </div>
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Admin component 6: branch cards.
export function BranchManager({
  branches,
  onEdit,
}: {
  branches: Branch[];
  onEdit: (b: Branch) => void;
}) {
  return (
    <div className="admin-branch-grid">
      {branches.map((b) => (
        <article className="admin-branch" key={b.id}>
          <img src={b.image} alt={b.name} />
          <div>
            <h3>{b.name}</h3>
            <p>{b.address}</p>
            <button
              className="btn outline small"
              onClick={() => onEdit(b)}
            >
              Edit Branch
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

// Admin component 7: branch editing form.
export function BranchForm({
  branch,
  onSave,
  onCancel,
}: {
  branch: Branch | null;
  onSave: (v: Branch) => Promise<void>;
  onCancel: () => void;
}) {

  
const [v, setV] = useState<Branch>({
  id: branch?.id ?? '',
  name: branch?.name ?? '',
  city: branch?.city ?? '',
  address: branch?.address ?? '',
  description: branch?.description ?? '',
  image: branch?.image ?? '',
  rating: branch?.rating ?? 0,
  amenities: branch?.amenities ?? [],
  policies: branch?.policies ?? [],
  cancellationHours: branch?.cancellationHours ?? 48,
});

// Stores the amenity currently being typed.
const [newAmenity, setNewAmenity] = useState('');

// Add a new amenity to the branch.
const addAmenity = () => {
  const amenity = newAmenity.trim();

  if (!amenity) return;

  // Prevent duplicate amenities.
  if (v.amenities.some(a => a.toLowerCase() === amenity.toLowerCase())) {
    return;
  }

  setV(prev => ({
    ...prev,
    amenities: [...prev.amenities, amenity],
  }));

  setNewAmenity('');
};

// Remove an amenity from the branch.
const removeAmenity = (amenity: string) => {
  setV(prev => ({
    ...prev,
    amenities: prev.amenities.filter(a => a !== amenity),
  }));
};


  const set = (k: keyof Branch, value: unknown) =>
    setV((prev) => ({ ...prev, [k]: value }));

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(v);
      }}
    >
      {(['name', 'city', 'address', 'description', 'image'] as const).map(
        (k) => (
          <label key={k} className={k === 'description' ? 'full' : ''}>
            {k.toUpperCase()}
            <input
              required
              value={v[k]}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        )
      )}
      <label>
        Rating
        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={v.rating}
          onChange={(e) => set('rating', Number(e.target.value))}
        />
      </label>

<label>
  Cancellation Period (Hours)
  <input
    type="number"
    min="0"
    step="1"
    required
    value={v.cancellationHours}
    onChange={(e) =>
      set('cancellationHours', Number(e.target.value))
    }
  />
</label>



{/* Branch amenities */}
<div className="amenities-field full">
  <label htmlFor="new-amenity">Amenities</label>

  <div className="amenity-input-row">
    <input
      id="new-amenity"
      type="text"
      placeholder="e.g. Free Wi-Fi, Swimming Pool"
      value={newAmenity}
      onChange={(e) => setNewAmenity(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addAmenity();
        }
      }}
    />

    <button
      type="button"
      className="btn"
      onClick={addAmenity}
      disabled={!newAmenity.trim()}
    >
      <Plus size={17} />
      Add
    </button>
  </div>

  {v.amenities.length > 0 && (
    <div className="amenity-list">
      {v.amenities.map((amenity) => (
        <div className="amenity-tag" key={amenity}>
          <span>{amenity}</span>

          <button
            type="button"
            onClick={() => removeAmenity(amenity)}
            aria-label={`Remove ${amenity}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>

      <div className="actions full">
        <button type="button" className="btn outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn">
  {branch ? 'Save Branch' : 'Add Branch'}
</button>
      </div>
    </form>
  );
}

// Admin component 8: user management list.
export function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <Status value={u.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Admin component 9: notification composer.
export function NotificationComposer({
  onSend,
}: {
  onSend: (title: string, message: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSend(title, message);
        setTitle('');
        setMessage('');
      }}
    >
      <label className="full">
        Notification Title
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="full">
        Message
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <div className="full">
        <button className="btn">
          <Bell size={16} /> Send to All Guests
        </button>
      </div>
    </form>
  );
}

// Admin component 10: simple accessible report bars.

// Admin component 10: dynamic monthly booking chart.
export function RevenueChart({
  bookings
}: {
  bookings: Booking[];
}) {
  // Get the current month and year.
  const today = new Date();

  // Generate the last 12 months dynamically.
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (11 - index),
      1
    );

    const year = date.getFullYear();
    const month = date.getMonth();

    // Count bookings created during this month.
    const count = bookings.filter((booking) => {
      const bookingDate = new Date(booking.createdAt);

      return (
        !Number.isNaN(bookingDate.getTime()) &&
        bookingDate.getFullYear() === year &&
        bookingDate.getMonth() === month
      );
    }).length;

    return {
      key: `${year}-${month}`,
      label: date.toLocaleDateString('en-ZA', {
        month: 'short',
        year: '2-digit'
      }),
      count
    };
  });

const max = Math.max(
    1,
    ...months.map((month) => month.count)
  );

  return (
    <div className="report-chart">
      <h3>Bookings by Month (Last 12 Months)</h3>

      <div className="bars">
        {months.map((month) => (
          <div key={month.key}>
            <span
              title={`${month.label}: ${month.count} bookings`}
              style={{
                height:
                  month.count === 0
                    ? '0px'
                    : `${Math.max(8, (month.count / max) * 180)}px`
              }}
            />

            <small>{month.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}


// Admin component 11: confirmation and feedback panel.
export function AdminFeedback({ message }: { message: string }) {
  return (
    <div className="admin-feedback">
      <CheckCircle size={22} />
      {message}
    </div>
  );
}

// Admin component 12: settings summary.
export function SettingsPanel() {
  return (
    <div className="settings-panel">
      <Settings size={25} />
      <h3>Admin Settings</h3>
      <p>
        Room prices are shown in South African Rands (ZAR). Admin accounts are
        protected by role-based API access.
      </p>
      <p>
        Use the Room Management screen to update availability, rates, and
        images.
      </p>
    </div>
  );
}