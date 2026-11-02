
import { useState } from "react";
import { loginUser, registerUser } from "../api";

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await loginUser(username, password)
          : await registerUser(username, email, password);

      onAuthSuccess({
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) =>
      current === "login" ? "register" : "login"
    );
    setError("");
  }

  return (
    <section className="auth-panel">
      <h2>
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>

      <p>
        {mode === "login"
          ? "Log in to access your saved conversations."
          : "Create an account to save your chats."}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="auth-username">Username</label>
        <input
          id="auth-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />

        {mode === "register" && (
          <>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </>
        )}

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={
            mode === "login"
              ? "current-password"
              : "new-password"
          }
          minLength={8}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait..."
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login"
          ? "New here?"
          : "Already have an account?"}{" "}
        <button type="button" onClick={switchMode}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </section>
  );
}

export default AuthForm;
