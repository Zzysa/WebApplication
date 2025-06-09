import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase"; 
import "./App.css";

const API_GATEWAY_URL = "http://localhost:8000";

const TEST_USER_EMAIL = "text@example.com";
const TEST_USER_PASSWORD = "password";

function App() {
  const [user, setUser] = useState(null);
  const [protectedData, setProtectedData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); 
      if (!currentUser) {
        setProtectedData(null); 
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    } catch (err) {
      console.error("Login error:", err);
      setError(`Login failed. Did you create user ${TEST_USER_EMAIL}?`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchProtectedData = async () => {
    if (!user) {
      setError("You must be logged in to fetch data.");
      return;
    }

    setError(null);
    setProtectedData("Loading...");

    try {
      const idToken = await user.getIdToken();

      const response = await axios.get(`${API_GATEWAY_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      setProtectedData(response.data);
    } catch (err) {
      console.error("Failed to fetch protected data:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load protected data.";
      setError(errorMessage);
      setProtectedData(null);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Loading...</h1>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Microservice App with Firebase Auth</h1>
        <div className="auth-buttons">
          {!user ? (
            <button type="button" onClick={handleLogin}>
              Login as {TEST_USER_EMAIL}
            </button>
          ) : (
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>

        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {user && (
          <div className="protected-section">
            <p>
              Welcome, <strong>{user.email}</strong>
            </p>
            <button onClick={fetchProtectedData}>Get Protected Data</button>
            <h2>Protected Data from Account Service:</h2>
            {protectedData && (
              <pre className="data-preview">
                {JSON.stringify(protectedData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;