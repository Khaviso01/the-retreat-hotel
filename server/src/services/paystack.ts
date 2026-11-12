
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }

  return key;
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type InitializedPayment = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type VerifiedPayment = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  metadata?: {
    bookingId?: string;
  };
};

async function paystackRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
  );

  const result =
    (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !result.status) {
    throw new Error(
      result.message || 'Paystack request failed.'
    );
  }

  return result.data;
}

// Initialize a hosted Paystack checkout.
export async function initializePayment(input: {
  email: string;
  amount: number;
  reference: string;
  bookingId: string;
}) {
  return paystackRequest<InitializedPayment>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,

        // Paystack expects ZAR amounts in cents.
        amount: input.amount * 100,

        currency: 'ZAR',
        reference: input.reference,

        callback_url:
          `${process.env.CLIENT_URL || 'http://localhost:5173'}` +
          `/payment/callback?bookingId=${encodeURIComponent(input.bookingId)}`,

        metadata: {
          bookingId: input.bookingId
        }
      })
    }
  );
}

// Verify payment directly with Paystack.
export async function verifyPayment(reference: string) {
  return paystackRequest<VerifiedPayment>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}
