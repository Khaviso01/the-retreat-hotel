import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import {
  Home,
  Branches,
  HotelDetails,
  Checkout,
  Confirmation,
  Bookings,
  BookingDetails,
  Favourites,
  Notifications,
  Profile,
  Login,
  AuthSuccess,
  Reviews,
} from './pages/GuestPages';
import {
  AdminDashboard,
  AdminRooms,
  AdminBookings,
  AdminBranches,
  AdminUsers,
  AdminReviews,
  AdminNotifications,
  AdminReports,
  AdminSettings,
  AdminSignout,
} from './pages/AdminPages';
import PaymentCallback from './pages/PaymentCallback';
import GoogleCallback from './pages/GoogleCallback';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

/**
 * Route guard component enforcing administrator role authorization.
 * Redirects non-admin users to the login screen with state preserving the original destination.
 */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const location = useLocation();

  return user?.role === 'admin' ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}

/**
 * Main application routing component for The Retreat.
 * Configures global context provider, client-side routing hierarchy, and admin route guards.
 */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Portal Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/branches/:id" element={<HotelDetails />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/confirmation/:id" element={<Confirmation />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetails />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin-success" element={<AuthSuccess />} />
          <Route path="/signed-out" element={<AuthSuccess signedOut />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminOnly>
                <AdminDashboard />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <AdminOnly>
                <AdminRooms />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <AdminOnly>
                <AdminBookings />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <AdminOnly>
                <AdminBranches />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminOnly>
                <AdminUsers />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <AdminOnly>
                <AdminReviews />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <AdminOnly>
                <AdminNotifications />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminOnly>
                <AdminReports />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminOnly>
                <AdminSettings />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/signout"
            element={
              <AdminOnly>
                <AdminSignout />
              </AdminOnly>
            }
          />

          {/* Fallback Catch-All Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}