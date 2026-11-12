import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

// ForgotPassword component allows users to request a password reset link by entering their email address.
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Handle form submission for requesting a password reset link
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate the email input to ensure it is not empty
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Use the Vite proxy for local development.
      const API_URL = import.meta.env.VITE_API_URL || "/api";

      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      // Parse the response and handle errors appropriately
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Forgot password API error:", {
          status: response.status,
          data,
        });

        // Throw an error with a message from the response or a default message
        throw new Error(
          data.error ||
          `Request failed with status ${response.status}`
        );
      }

      // Set a success message indicating that a password reset link will be sent if the email exists in the system
      setMessage(
        data.message ||
        "If an account exists with this email, a password reset link will be sent."
      );

    } catch (err) {
      console.error("Forgot password request failed:", err);

      // Set an error message to inform the user that the request could not be processed
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your request. Please try again later."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>The Retreat</h1>
        <h2>Forgot Password?</h2>

        <p>
          Enter your email address to receive a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-email">
            Email Address
          </label>

          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <button
            className="btn wide"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <Link to="/login">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
