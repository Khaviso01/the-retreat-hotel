export type User = {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'admin';
};

export type Branch = {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  image: string;
  rating: number;
  reviewCount?: number;
  amenities: string[];
  policies: string[];
  cancellationHours: number;
};


export type Room = {
  id: string;
  branchId: string;
  name: string;
  type: string;
  capacity: number;
  price: number;
  available: boolean;
  image: string;
  description: string;
};

export type Booking = {
  id: string;
  userId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus?: 'pending' | 'success' | 'failed';
  paymentReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

export type Review = {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  user?: {
    name: string;
  };
  branch?: {
    name: string;
  };
};

export type Notice = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Stats = {
  bookings: number;
  revenue: number;
  branches: number;
  rooms: number;
  users: number;
  occupancy: number;
};


/**
 * Formats a numerical amount into a South African Rand (ZAR) currency string.
 */
export const money = (amount: number) => 'R' + amount.toLocaleString('en-ZA');

/**
 * Generic API fetch client configured with automatic JWT bearer token header injection
 * and robust error parsing for backend responses.
 */
export const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('retreat_token');
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data as T;
};

/**
 * Helper wrapper for sending HTTP mutation requests (POST, PATCH, DELETE, PUT) with optional JSON bodies.
 */
export const send = <T>(path: string, method: string, body?: unknown) =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });