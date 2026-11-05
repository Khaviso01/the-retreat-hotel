
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Trash2 } from 'lucide-react';

import {
  api,
  send,
  money,
  type Stats,
  type Branch,
  type Room,
  type Booking,
  type User,
} from '../lib/api';

import { useApp } from '../context/AppContext';

import {
  AdminSidebar,
  PageTitle,
  Loading,
  Empty,
} from '../components/shared/Shared';

import {
  StatsCards,
  AdminSearch,
  RoomsTable,
  RoomForm,
  BookingsTable,
  BranchManager,
  BranchForm,
  UsersTable,
  NotificationComposer,
  RevenueChart,
  AdminFeedback,
  SettingsPanel,
} from '../components/admin/AdminComponents';

// Admin layout is protected by both client routing and server role checks.
export function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">{children}</main>
    </div>
  );
}

// Fetch admin data from the API and provide a reload function.
function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');

  // Fetch the requested data and capture any request errors.
  const reload = () =>
    api<T>(path)
      .then(setData)
      .catch(e => setError(e.message));

  // Reload data whenever the API path changes.
  useEffect(() => {
    reload();
  }, [path]);

  return { data, error, reload };
}

// Display dashboard statistics, revenue analytics, and recent bookings.
export function AdminDashboard() {
  const { data: stats } = useAdminData<Stats>('/admin/stats');
  const { data: bookings } = useAdminData<Booking[]>('/bookings');

  return (
    <AdminLayout>
      <PageTitle
        title="Dashboard"
        subtitle="Welcome to The Retreat administration"
      />

      {stats ? <StatsCards stats={stats} /> : <Loading />}

      <div className="admin-dashboard-grid">
        <div className="panel">
          <RevenueChart bookings={bookings || []} />
        </div>

        <div className="panel">
          <h3>Recent Bookings</h3>

          {bookings?.slice(0, 5).map(b => (
            <p className="flex-between" key={b.id}>
              <span>{b.id}</span>
              <strong>{money(b.total)}</strong>
            </p>
          ))}

          <Link to="/admin/bookings">
            View All Bookings →
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

// Manage hotel rooms, including searching, adding, editing, and deleting.
export function AdminRooms() {
  const { data: rooms, reload } = useAdminData<Room[]>('/rooms');
  const { data: branches } = useAdminData<Branch[]>('/branches');

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState(false);

  const { toast, confirm } = useApp();

  // Create a new room or update the currently selected room.
  const save = async (v: Omit<Room, 'id'>) => {
    await send(
      editing ? '/admin/rooms/' + editing.id : '/admin/rooms',
      editing ? 'PATCH' : 'POST',
      v
    );

    toast(
      editing
        ? 'Room updated successfully!'
        : 'Room added successfully!'
    );

    setForm(false);
    setEditing(null);
    reload();
  };

  // Request confirmation before permanently deleting a room.
  const del = (room: Room) =>
    confirm(`Permanently delete ${room.name}?`, async () => {
      await send('/admin/rooms/' + room.id, 'DELETE');
      toast('Room deleted successfully!');
      reload();
    });

  return (
    <AdminLayout>
      <PageTitle
        title={
          form
            ? editing
              ? 'Edit Room'
              : 'Add New Room'
            : 'Manage Rooms'
        }
        subtitle="Create, update, and manage room availability"
        action={
          !form && (
            <button
              className="btn"
              onClick={() => {
                setEditing(null);
                setForm(true);
              }}
            >
              <Plus size={16} />
              Add Room
            </button>
          )
        }
      />

      {form && branches ? (
        <div className="panel">
          <RoomForm
            key={editing?.id || 'new'}
            branches={branches}
            initial={editing}
            onSave={save}
            onCancel={() => setForm(false)}
          />
        </div>
      ) : (
        <div className="panel">
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder="Search rooms by name or type..."
          />

          {rooms && branches ? (
            <RoomsTable
              rooms={rooms.filter(r =>
                (r.name + ' ' + r.type)
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )}
              branches={branches}
              onEdit={r => {
                setEditing(r);
                setForm(true);
              }}
              onDelete={del}
            />
          ) : (
            <Loading />
          )}
        </div>
      )}
    </AdminLayout>
  );
}

// Display guest bookings and allow administrators to update their statuses.
export function AdminBookings() {
  const { data: bookings, reload } =
    useAdminData<Booking[]>('/bookings');

  const { data: rooms } = useAdminData<Room[]>('/rooms');
  const { confirm, toast } = useApp();

  // Confirm and submit a booking status update.
  const update = (b: Booking, status: Booking['status']) =>
    confirm(
      `${status === 'confirmed' ? 'Approve' : 'Cancel'} booking ${b.id}?`,
      async () => {
        await send('/bookings/' + b.id, 'PATCH', { status });
        toast('Booking ' + status + '!');
        reload();
      }
    );

  // Confirm and remove a user without booking history.
  const handleDeleteUser = (user: User) => {
    confirm(
      `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
      async () => {
        try {
          await send(
            `/admin/users/${user.id}`,
            'DELETE'
          );

          toast('User removed successfully!');
          reload();
        } catch (err) {
          toast(
            err instanceof Error
              ? err.message
              : 'Failed to remove user.'
          );
        }
      }
    );
  };

  return (
    <AdminLayout>
      <PageTitle
        title="Manage Bookings"
        subtitle="Approve and manage guest reservations"
      />

      <div className="panel">
        {bookings && rooms ? (
          <BookingsTable
            bookings={bookings}
            rooms={rooms}
            onStatus={update}
          />
        ) : (
          <Loading />
        )}
      </div>
    </AdminLayout>
  );
}

// Display hotel branches and allow administrators to edit their details.


export function AdminBranches() {
  const { data: branches, reload } =
    useAdminData<Branch[]>('/branches');

  const [editing, setEditing] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { toast } = useApp();

  // Open empty form to add a branch
  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  // Open existing branch for editing
  const handleEdit = (branch: Branch) => {
    setEditing(branch);
    setFormOpen(true);
  };

  // Close form
  const handleCancel = () => {
    setEditing(null);
    setFormOpen(false);
  };

  // Add or update branch
  const handleSave = async (values: Branch) => {
    if (editing) {
      await send(
        '/admin/branches/' + editing.id,
        'PATCH',
        values
      );

      toast('Branch updated successfully!');
    } else {
      const { id, ...newBranch } = values;

      await send(
        '/admin/branches',
        'POST',
        newBranch
      );

      toast('Branch added successfully!');
    }

    handleCancel();
    reload();
  };

  return (
    <AdminLayout>
      <PageTitle
        title={
          formOpen
            ? editing
              ? 'Edit Branch'
              : 'Add New Branch'
            : 'Manage Branches'
        }
        subtitle="Create, update, and manage hotel branches"
        action={
          !formOpen && (
            <button
              type="button"
              className="btn"
              onClick={handleAdd}
            >
              <Plus size={17} />
              Add Branch
            </button>
          )
        }
      />

      {formOpen ? (
        <div className="panel">
          <BranchForm
            key={editing?.id ?? 'new'}
            branch={editing}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      ) : branches ? (
        <BranchManager
          branches={branches}
          onEdit={handleEdit}
        />
      ) : (
        <Loading />
      )}
    </AdminLayout>
  );
}



// Display registered guest and administrator accounts.
// Manage registered users and their access roles.
export function AdminUsers() {
  const { data: users, reload } =
    useAdminData<User[]>('/admin/users');

  const { toast, confirm } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'GUEST' as 'GUEST' | 'ADMIN',
  });

  // Create a user through the admin API.
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await send('/admin/users', 'POST', form);

      toast('User added successfully!');
      setShowForm(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'GUEST',
      });
      reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add user.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Confirm changes to an existing user's role.
  const handleRoleChange = (
    user: User,
    role: 'GUEST' | 'ADMIN'
  ) => {
    if (user.role.toUpperCase() === role) return;

    confirm(
      `Change ${user.name}'s role to ${role}?`,
      async () => {
        try {
          await send(
            `/admin/users/${user.id}/role`,
            'PATCH',
            { role }
          );

          toast('User role updated successfully!');
          reload();
        } catch (err) {
          toast(
            err instanceof Error
              ? err.message
              : 'Failed to update user role.'
          );
        }
      }
    );
  };

  // Remove a user after confirmation.
  const handleDeleteUser = (user: User) => {
    confirm(
      `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
      async () => {
        try {
          // Delete the user through the admin API.
          await send(
            `/admin/users/${user.id}`,
            'DELETE'
          );

          toast('User removed successfully!');

          // Refresh the users table.
          reload();
        } catch (err) {
          toast(
            err instanceof Error
              ? err.message
              : 'Failed to remove user.'
          );
        }
      }
    );
  };

  return (
    <AdminLayout>
      <PageTitle
        title="Manage Users"
        subtitle="Add users and manage access permissions"
        action={
          !showForm && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowForm(true)}
            >
              <Plus size={17} />
              Add User
            </button>
          )
        }
      />

      {showForm && (
        <div className="panel">
          <h3>Add New User</h3>

          <form
            className="admin-user-form"
            onSubmit={handleAddUser}
          >
            <label>
              Full Name
              <input
                required
                value={form.name}
                onChange={e =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="Enter full name"
              />
            </label>

            <label>
              Email Address
              <input
                required
                type="email"
                value={form.email}
                onChange={e =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
              />
            </label>

            <label>
              Password
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={e =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                placeholder="Minimum 8 characters"
              />
            </label>

            <label>
              Assign Role
              <select
                value={form.role}
                onChange={e =>
                  setForm({
                    ...form,
                    role: e.target.value as
                      'GUEST' | 'ADMIN',
                  })
                }
              >
                <option value="GUEST">Guest</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h3>Registered Users</h3>

        {users ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Assign Role</th>
                  <th>Remove</th>
                </tr>
              </thead>

              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={user.role.toUpperCase()}
                        onChange={e =>
                          handleRoleChange(
                            user,
                            e.target.value as
                            'GUEST' | 'ADMIN'
                          )
                        }
                      >
                        <option value="GUEST">
                          Guest
                        </option>
                        <option value="ADMIN">
                          Admin
                        </option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete-user"
                        onClick={() => handleDeleteUser(user)}
                        title={`Remove ${user.name}`}
                        aria-label={`Remove ${user.name}`}
                      >
                        <Trash2 size={17} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Loading />
        )}
      </div>
    </AdminLayout>
  );
}

// Display guest reviews, including ratings and written feedback.

export function AdminReviews() {
  const { data: reviews } = useAdminData<{
    id: string;
    text: string;
    rating: number;
    branchId: string;
    createdAt: string;
    user?: { name: string };
    branch?: { name: string };
  }[]>('/reviews');

  const { data: branches } =
    useAdminData<Branch[]>('/branches');

  return (
    <AdminLayout>
      <PageTitle
        title="Guest Reviews"
        subtitle="Monitor hotel ratings and guest feedback"
      />

      {/* Overall ratings for each hotel branch */}
      <div className="admin-cards">
        {branches?.map(branch => (
          <div className="panel" key={branch.id}>
            <h3>{branch.name}</h3>

            <div className="branch-rating">
              <Star
                size={20}
                fill="#FACC15"
                color="#FACC15"
              />

              {branch.reviewCount ? (
                <>
                  <strong>{branch.rating.toFixed(1)} / 5</strong>
                  <span className="muted">
                    ({branch.reviewCount} reviews)
                  </span>
                </>
              ) : (
                <span className="muted">Not yet rated</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Individual guest reviews */}
      <h1 className="admin-review-title">Guest Feedback</h1>

      <div className="admin-cards">
        {reviews?.length ? (
          reviews.map(review => (
            <div className="panel" key={review.id}>
              <div className="branch-rating">
                <Star
                  size={18}
                  fill="#FACC15"
                  color="#FACC15"
                />

                <strong>{review.rating} / 5</strong>
              </div>

              <p>{review.text}</p>

              <strong>
                {review.user?.name ?? 'Guest'}
              </strong>

              <p className="muted">
                {review.branch?.name ?? review.branchId}
              </p>

              {review.createdAt && (
                <small className="muted">
                  {new Date(review.createdAt)
                    .toLocaleDateString('en-ZA')}
                </small>
              )}
            </div>
          ))
        ) : (
          <Empty message="No reviews yet." />
        )}
      </div>
    </AdminLayout>
  );
}


// Send notifications and announcements to registered guests.
export function AdminNotifications() {
  const { toast } = useApp();

  return (
    <AdminLayout>
      <PageTitle
        title="Notifications"
        subtitle="Send updates and offers to registered guests"
      />

      <div className="panel">
        <NotificationComposer
          onSend={async (title, message) => {
            const result = await send<{ sent: number }>(
              '/admin/notifications',
              'POST',
              { title, message }
            );

            toast(
              `Notification sent to ${result.sent} guests.`
            );
          }}
        />
      </div>
    </AdminLayout>
  );
}

// Display booking statistics and revenue analytics.
export function AdminReports() {
  const { data: stats } = useAdminData<Stats>('/admin/stats');
  const { data: bookings } =
    useAdminData<Booking[]>('/bookings');

  return (
    <AdminLayout>
      <PageTitle
        title="Reports & Analytics"
        subtitle="Business performance overview"
      />

      {stats && <StatsCards stats={stats} />}

      <div className="panel">
        <RevenueChart bookings={bookings || []} />
      </div>
    </AdminLayout>
  );
}

// Display the administration settings interface.
export function AdminSettings() {
  return (
    <AdminLayout>
      <PageTitle
        title="Settings"
        subtitle="Administration preferences"
      />

      <div className="panel">
        <SettingsPanel />
      </div>
    </AdminLayout>
  );
}