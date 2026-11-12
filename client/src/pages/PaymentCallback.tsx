
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { send } from '../lib/api';

// PaymentResult type defines the structure of the response from the payment verification API.
type PaymentResult = {
  success: boolean;
  bookingId: string;
  status: string;
  paymentStatus: string;
};

// PaymentCallback component handles the callback from the payment gateway
// verifies the payment
// and navigates to the confirmation page.
export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Read the bookingId and reference from the query parameters
  const bookingId = params.get('bookingId');
  const reference = params.get('reference');

  // Use a ref to ensure the verification process only runs once
  const started = useRef(false);
  const [message, setMessage] = useState(
    'Verifying your payment securely...'
  );
  const [error, setError] = useState(false);

  // Use useEffect to perform the payment verification when the component mounts
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // If bookingId is missing, set an error state and message
    if (!bookingId) {
      setError(true);
      setMessage(
        'Booking information is missing. Please check your reservations.'
      );
      return;
    }

    // Define an async function to verify the payment with the server
    async function verify() {
      try {
        const result = await send<PaymentResult>(
          '/payments/verify',
          'POST',
          { bookingId }
        );

        // If the payment verification fails, throw an error to be caught below
        if (!result.success) {
          throw new Error('Payment could not be confirmed.');
        }

        // If the payment is successful, update the message and navigate to the confirmation page
        setMessage('Payment successful! Opening your booking...');

        navigate('/confirmation/' + result.bookingId, {
          replace: true
        });
      } catch (err) {
        setError(true);
        setMessage(
          err instanceof Error
            ? err.message
            : 'Unable to verify your payment.'
        );
      }
    }

    // Call the verify function to initiate the payment verification process
    void verify();
  }, [bookingId, reference, navigate]);

  return (
    <main className="container section">
      <div
        className="panel"
        style={{
          maxWidth: 560,
          margin: '60px auto',
          textAlign: 'center',
          padding: 32
        }}
      >
        <h1>{error ? 'Payment Not Confirmed' : 'Checking Payment'}</h1>

        <p className="muted">{message}</p>

        {error && (
          <div style={{ marginTop: 24 }}>
            <button
              className="btn"
              onClick={() => navigate('/bookings')}
            >
              View My Bookings
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
