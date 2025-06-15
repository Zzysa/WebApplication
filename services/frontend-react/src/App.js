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
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [products, setProducts] = useState([]);
  const [adminUserList, setAdminUserList] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAndSetUserData = async (firebaseUser) => {
      try {
        const idToken = await firebaseUser.getIdToken();
        await axios.post(
          `${API_GATEWAY_URL}/api/auth/sync`,
          {},
          { headers: { Authorization: `Bearer ${idToken}` } },
        );
        const response = await axios.get(
          `${API_GATEWAY_URL}/api/users/me`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );
        setUserData(response.data);
      } catch (err) {
        setError("Could not sync or fetch user data.");
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setAdminUserList(null);
        setError("");
        setLoading(false);
      } else {
        fetchAndSetUserData(currentUser).finally(() => setLoading(false));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_GATEWAY_URL}/api/products`);
        setProducts(response.data);
      } catch (err) {
        setError("Could not fetch products.");
      }
    };
    fetchProducts();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchAdminUserList = async () => {
    if (!user || userData?.role !== "admin") return;
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(`${API_GATEWAY_URL}/api/users`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setAdminUserList(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch admin data.");
    }
  };

  const getUsername = (email) => {
    return email ? email.split("@")[0] : "Guest";
  };

  if (loading) {
    return <div className="App-header">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Microservice Shop</h1>
        {user && userData ? (
          <div className="user-section">
            <p>
              Hello, <strong>{getUsername(user.email)}</strong>! (Role:{" "}
              {userData.role})
            </p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <p className="guest-section">
            Welcome, Guest! Please log in or register.
          </p>
        )}
      </header>

      <main>
        {user ? (
          <>
            {userData?.role === "admin" && (
              <div className="admin-panel">
                <h3>Admin Panel</h3>
                <button onClick={fetchAdminUserList}>Fetch All Users</button>
                {adminUserList && (
                  <div>
                    <h4>All Users List:</h4>
                    <pre className="data-preview">
                      {JSON.stringify(adminUserList, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="centered-content">
            {showLogin ? (
              <>
                <Login />
                <p>
                  No account?{" "}
                  <button
                    className="link-button"
                    onClick={() => setShowLogin(false)}
                  >
                    Register here
                  </button>
                </p>
              </>
            ) : (
              <>
                <Register />
                <p>
                  Already have an account?{" "}
                  <button
                    className="link-button"
                    onClick={() => setShowLogin(true)}
                  >
                    Login here
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        <div className="product-list">
          <h2>Our Products</h2>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <div key={product._id} className="product-card">
                  <img
                    src={product.imageUrl || "https://via.placeholder.com/150"}
                    alt={product.name}
                    className="product-image"
                  />
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <p className="price">${product.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No products found.</p>
          )}
        </div>
        {error && <p className="error-message">{error}</p>}
      </main>
    </div>
  );
}

export default App;