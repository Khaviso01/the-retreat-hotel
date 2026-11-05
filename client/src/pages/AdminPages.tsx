
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';

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
export function AdminUsers() {
  const { data } = useAdminData<User[]>('/admin/users');

  return (
    <AdminLayout>
      <PageTitle
        title="Manage Users"
        subtitle="Registered guests and administrators"
      />

      <div className="panel">
        {data ? <UsersTable users={data} /> : <Loading />}
      </div>
    </AdminLayout>
  );
}

// Display guest reviews, including ratings and written feedback.
export function AdminReviews() {
  const { data } = useAdminData<
    {
      id: string;
      text: string;
      rating: number;
      branchId: string;
    }[]
  >('/reviews');

  return (
    <AdminLayout>
      <PageTitle
        title="Guest Reviews"
        subtitle="Read submitted hotel feedback"
      />

      <div className="admin-cards">
        {data?.length ? (
          data.map(r => (
            <div className="panel" key={r.id}>
              <h3>★ {r.rating} / 5</h3>
              <p>{r.text}</p>
              <small>{r.branchId}</small>
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

// Confirm administrator sign-out and redirect to the signed-out page.
export function AdminSignout() {
  const { logout, confirm } = useApp();
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <PageTitle
        title="Sign Out"
        subtitle="Securely end your admin session"
      />

      <div className="panel">
        <h2>Sign out of The Retreat?</h2>
        <p>You will return to the guest site.</p>

        <button
          className="btn danger"
          onClick={() =>
            confirm(
              'Are you sure you want to sign out of the admin dashboard?',
              () => {
                logout();
                navigate('/signed-out');
              }
            )
          }
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </AdminLayout>
  );
}
