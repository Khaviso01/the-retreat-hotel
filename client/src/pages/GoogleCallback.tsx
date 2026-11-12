
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// GoogleCallback component handles the callback from Google's OAuth2 login flow
export default function GoogleCallback() {
  const { googleLogin, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // State variables for error handling and preventing duplicate code exchanges
  const [error, setError] = useState('');
  const started = useRef(false);

  // Read the code and next parameters from the query string
  const code = params.get('code');
  const next = params.get('next');

  useEffect(() => {
    // Prevent duplicate code exchanges.
    if (started.current) return;
    started.current = true;

    // Check whether Google returned a login code.
    if (!code) {
      setError('Google login code is missing.');
      return;
    }

    // Exchange the temporary code for a JWT and user.
    googleLogin(code)
      .then((user) => {
        toast('Successfully signed in with Google!');

        // Only allow internal application redirects.
        const safeNext =
          next?.startsWith('/') && !next.startsWith('//')
            ? next
            : '/signin-success';

        // Redirect based on the authenticated user's role.
        navigate(
          user.role === 'admin' ? '/admin' : safeNext,
          { replace: true }
        );
      })

      // Handle errors during the Google login process.
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Google sign-in failed.'
        );
      });
  }, [code, next, googleLogin, navigate, toast]);

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>The Retreat</h1>
        <small>HOTELS & SUITES</small>

        {error ? (
          <>
            <h2>Google Sign-In Failed</h2>
            <p className="error">{error}</p>

            <button
              type="button"
              className="btn wide"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <h2>Signing you in...</h2>
            <p className="muted">
              Please wait while we verify your Google account.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
