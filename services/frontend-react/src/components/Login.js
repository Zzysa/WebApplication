import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const styles = {
    formContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      width: "300px",
      margin: "auto",
    },
    input: {
      width: "100%",
      padding: "8px",
      boxSizing: "border-box",
    },
    button: {
      width: "50%",
      padding: "10px",
      cursor: "pointer",
    },
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Login</h2>
      <form style={styles.formContainer} onSubmit={handleLogin}>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button style={styles.button} type="submit">
          Login
        </button>
      </form>
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
    </div>
  );
};

export default Login;