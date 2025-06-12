import React, { useState, useEffect } from "react";
import axios from "axios";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

const API_GATEWAY_URL = "http://localhost:8000";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true); 
  const [protectedData, setProtectedData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          await axios.post(
            `${API_GATEWAY_URL}/api/auth/sync`,
            {},
            { headers: { Authorization: `Bearer ${idToken}` } },
          );
          console.log("User synced successfully!");
        } catch (err) {
          console.error("Failed to sync user:", err);
          setError("Could not sync user with backend.");
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setProtectedData(null);
    setError("");
  };

  const fetchProtectedData = async () => {
    if (!user) return;
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(`${API_GATEWAY_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setProtectedData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data.");
    }
  };

  if (loading) {
    return <div className="App-header">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Microservice App with Firebase Auth</h1>
        {user ? (
          <div className="protected-section">
            <p>
              Welcome, <strong>{user.email}</strong>
            </p>
            <button onClick={handleLogout}>Logout</button>
            <hr />
            <button onClick={fetchProtectedData}>Get Protected Data</button>
            {protectedData && (
              <pre className="data-preview">
                {JSON.stringify(protectedData, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div>
            {showLogin ? (
              <>
                <Login />
                <p>
                  No account?{" "}
                  <button className="link-button" onClick={() => setShowLogin(false)}>
                    Register here
                  </button>
                </p>
              </>
            ) : (
              <>
                <Register />
                <p>
                  Already have an account?{" "}
                  <button className="link-button" onClick={() => setShowLogin(true)}>
                    Login here
                  </button>
                </p>
              </>
            )}
          </div>
        )}
        {error && <p style={{ color: "red", marginTop: "20px" }}>{error}</p>}
      </header>
    </div>
  );
}

export default App;