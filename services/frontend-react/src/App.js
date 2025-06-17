import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";
import useDebounce from "./hooks/useDebounce";

const API_GATEWAY_URL = process.env.REACT_APP_API_URL || "";

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adminUserList, setAdminUserList] = useState(null);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [view, setView] = useState("products");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const [filters, setFilters] = useState({
    category: "",
    search: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const debouncedFilters = useDebounce(filters, 500);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  const fetchProducts = useCallback(async () => {
	try {
		const cleanParams = Object.fromEntries(
			Object.entries(debouncedFilters).filter(
				([_, value]) => value !== "" && value !== null && value !== undefined,
			),
		);

		const response = await axios.get(`${API_GATEWAY_URL}/api/products`, {
			params: cleanParams,
		});

		setProducts(response.data);
		setError("");
	} catch (err) {
		console.error("Error fetching products:", err);
		setError(
			"Could not fetch products: " +
				(err.response?.data?.message || err.message),
		);
	}
  }, [debouncedFilters]);

  const applyCoupon = async () => {
	try {
	  const resp = await axios.post(`${API_GATEWAY_URL}/api/coupons/apply`, {
		code: couponCode,
		total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
	  });
	  setDiscount(resp.data.discount);
	} catch (e) {
	  alert(e.response?.data?.message || "Invalid coupon");
	}
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/categories`);
      setCategories(response.data);
    } catch (err) {
      setError("Could not fetch categories.");
    }
  }, []);

  const fetchUserOrders = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(`${API_GATEWAY_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setUserOrders(response.data);
    } catch (err) {
      setError("Could not fetch orders.");
    }
  }, [user]);

  const fetchAdminOrders = useCallback(async () => {
    if (!user || userData?.role !== "admin") return;
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/admin/orders`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      setAdminOrders(response.data);
    } catch (err) {
      setError("Could not fetch admin orders.");
    }
  }, [user, userData]);

  useEffect(() => {
	const fetchAndSetUserData = async (firebaseUser) => {
	  try {
		const idToken = await firebaseUser.getIdToken(true);
		
		await axios.post(
		  `${API_GATEWAY_URL}/api/auth/sync`,
		  {},
		  { 
			headers: { Authorization: `Bearer ${idToken}` },
			timeout: 10000
		  },
		);
		
		const response = await axios.get(`${API_GATEWAY_URL}/api/users/me`, {
		  headers: { Authorization: `Bearer ${idToken}` },
		  timeout: 10000
		});
		
		setUserData(response.data);
	  } catch (err) {
		console.error("User data fetch error:", err);
		if (err.response?.status === 304) {
		  console.log("User data not modified, using cached data");
		  return;
		}
		setError("Could not sync or fetch user data.");
	  }
	};
  
	const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
	  setUser(currentUser);
	  setCart([]);
	  if (!currentUser) {
		setUserData(null);
		setAdminUserList(null);
		setUserOrders([]);
		setAdminOrders([]);
		setError("");
		setLoading(false);
	  } else {
		fetchAndSetUserData(currentUser).finally(() => setLoading(false));
	  }
	});
  
	fetchProducts();
	fetchCategories();
	return () => unsubscribe();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    if (user && userData) {
      fetchUserOrders();
      if (userData.role === "admin") {
        fetchAdminOrders();
      }
    }
  }, [user, userData, fetchUserOrders, fetchAdminOrders]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      search: "",
      minPrice: "",
      maxPrice: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const handleDeleteProduct = async (productId) => {
    if (!user || userData?.role !== "admin") {
      setError("You do not have permission to delete products.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }
    try {
      const idToken = await user.getIdToken();
      await axios.delete(`${API_GATEWAY_URL}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      fetchProducts();
    } catch (err) {
      setError("Failed to delete product.");
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError("");
    if (!user || userData?.role !== "admin") return;
    try {
      const idToken = await user.getIdToken();
      const newCategory = {
        name: newCategoryName,
        description: newCategoryDesc,
      };
      await axios.post(`${API_GATEWAY_URL}/api/categories`, newCategory, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setNewCategoryName("");
      setNewCategoryDesc("");
      fetchCategories();
    } catch (err) {
      setError("Failed to create category.");
      console.error(err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setError("");
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const newProduct = {
        name: newProductName,
        price: parseFloat(newProductPrice),
        description: newProductDesc,
        category: newProductCategory || undefined,
      };
      await axios.post(`${API_GATEWAY_URL}/api/products`, newProduct, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setNewProductName("");
      setNewProductPrice("");
      setNewProductDesc("");
      setNewProductCategory("");
      fetchProducts();
    } catch (err) {
      setError("Failed to create product. Check console for details.");
      console.error(err);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const idToken = await user.getIdToken();
      const updatedData = {
        name: newProductName,
        price: parseFloat(newProductPrice),
        description: newProductDesc,
        category: newProductCategory || undefined,
      };
      await axios.put(
        `${API_GATEWAY_URL}/api/products/${editingProduct._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      setEditingProduct(null);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductDesc("");
      setNewProductCategory("");
      fetchProducts();
    } catch (err) {
      setError("Failed to update product.");
      console.error(err);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductPrice(product.price);
    setNewProductDesc(product.description);
    setNewProductCategory(product.category?._id || "");
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductDesc("");
    setNewProductCategory("");
  };

  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existingProduct = prevCart.find(
        (item) => item._id === product._id,
      );
      if (existingProduct) {
        return prevCart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const handleProceedToCheckout = () => {
    if (cart.length > 0) {
      setView("checkout");
    } else {
      setError("Your cart is empty.");
    }
  };

  const handleConfirmAndPay = async () => {
    if (!user) {
      setError("Please log in to place an order.");
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const orderData = {
        products: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice: cart.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        paymentMethod: selectedPaymentMethod,
      };

      const orderResponse = await axios.post(
        `${API_GATEWAY_URL}/api/orders`,
        orderData,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );

      const newOrder = orderResponse.data;

      const paymentData = {
        orderId: newOrder.id,
        amount: newOrder.totalPrice,
        method: selectedPaymentMethod,
      };

      await axios.post(
        `${API_GATEWAY_URL}/api/payments/process`,
        paymentData,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );

      alert("Order placed and payment processed successfully!");
      setCart([]);
      fetchUserOrders();
      setView("orders");
    } catch (err) {
      setError("Failed to place order or process payment.");
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (!user || userData?.role !== "admin") {
      setError("You do not have permission to update order status.");
      return;
    }
    try {
      const idToken = await user.getIdToken();
      await axios.patch(
        `${API_GATEWAY_URL}/api/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      fetchAdminOrders();
    } catch (err) {
      setError("Failed to update order status.");
      console.error(err);
    }
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
      setError(
        err.response?.data?.message || "Failed to fetch admin data.",
      );
    }
  };

  const getUsername = (email) => (email ? email.split("@")[0] : "Guest");

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ffa500",
      processing: "#1e90ff",
      shipped: "#32cd32",
      delivered: "#228b22",
      cancelled: "#dc143c",
      pending_payment: "#808080",
    };
    return colors[status] || "#666666";
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
			<div className="navigation-tabs">
			  <button onClick={() => setView("products")}>Products</button>
			  <button onClick={() => setView("cart")}>
				Cart ({cart.length})
			  </button>
			  <button
				onClick={() => {
				  setView("orders");
				  fetchUserOrders();
				}}
			  >
				My Orders
			  </button>
			  {userData?.role === "admin" && (
				<>
				  <button
					onClick={() => {
					  setView("admin-orders");
					  fetchAdminOrders();
					}}
				  >
					Manage Orders
				  </button>
				  <button onClick={() => setView("admin-panel")}>
					Admin Panel
				  </button>
				</>
			  )}
			</div>
  
			{view === "products" && (
			  <>
				<div className="filters-section">
				  <h3>Filters & Search</h3>
				  <div className="filters-row">
					<input
					  type="text"
					  placeholder="Search products..."
					  value={filters.search}
					  onChange={(e) =>
						handleFilterChange("search", e.target.value)
					  }
					/>
					<select
					  value={filters.category}
					  onChange={(e) =>
						handleFilterChange("category", e.target.value)
					  }
					>
					  <option value="">All Categories</option>
					  {categories.map((cat) => (
						<option key={cat._id} value={cat._id}>
						  {cat.name}
						</option>
					  ))}
					</select>
					<input
					  type="number"
					  placeholder="Min Price"
					  value={filters.minPrice}
					  onChange={(e) =>
						handleFilterChange("minPrice", e.target.value)
					  }
					/>
					<input
					  type="number"
					  placeholder="Max Price"
					  value={filters.maxPrice}
					  onChange={(e) =>
						handleFilterChange("maxPrice", e.target.value)
					  }
					/>
					<select
					  value={`${filters.sortBy}-${filters.sortOrder}`}
					  onChange={(e) => {
						const [sortBy, sortOrder] = e.target.value.split("-");
						handleFilterChange("sortBy", sortBy);
						handleFilterChange("sortOrder", sortOrder);
					  }}
					>
					  <option value="createdAt-desc">Newest First</option>
					  <option value="createdAt-asc">Oldest First</option>
					  <option value="name-asc">Name A-Z</option>
					  <option value="name-desc">Name Z-A</option>
					  <option value="price-asc">Price Low to High</option>
					  <option value="price-desc">Price High to Low</option>
					</select>
					<button onClick={clearFilters}>Clear Filters</button>
				  </div>
				</div>
  
				<div className="product-list">
				  <h2>Our Products</h2>
				  {products.length > 0 ? (
					<div className="products-grid">
					  {products.map((product) => (
						<div key={product._id} className="product-card">
						  <img
							src={
							  product.imageUrl ||
							  "https://via.placeholder.com/150"
							}
							alt={product.name}
							className="product-image"
						  />
						  <h3>{product.name}</h3>
						  {product.category && (
							<p className="product-category">
							  Category: {product.category.name}
							</p>
						  )}
						  <p>{product.description}</p>
						  <p className="price">${product.price.toFixed(2)}</p>
						  <button
							className="add-to-cart-button"
							onClick={() => handleAddToCart(product)}
						  >
							Add to Cart
						  </button>
						  {userData?.role === "admin" && (
							<div className="admin-buttons">
							  <button
								className="edit-button"
								onClick={() => handleEditClick(product)}
							  >
								Edit
							  </button>
							  <button
								className="delete-button"
								onClick={() => handleDeleteProduct(product._id)}
							  >
								Delete
							  </button>
							</div>
						  )}
						</div>
					  ))}
					</div>
				  ) : (
					<p>No products found.</p>
				  )}
				</div>
			  </>
			)}
  
			{view === "cart" && (
			  <div className="cart-section">
				<h3>Your Cart</h3>
				{cart.length > 0 ? (
				  <>
					<ul>
					  {cart.map((item) => (
						<li key={item._id}>
						  {item.name} - ${item.price} x {item.quantity}
						</li>
					  ))}
					</ul>
					<p>
					  Total: $
					  {cart
						.reduce(
						  (sum, item) => sum + item.price * item.quantity,
						  0,
						)
						.toFixed(2)}
					</p>
					<button onClick={handleProceedToCheckout}>
					  Proceed to Checkout
					</button>
				  </>
				) : (
				  <p>Your cart is empty.</p>
				)}
			  </div>
			)}
  
			{view === "checkout" && (
			  <div className="checkout-section">
				<h3>Checkout</h3>
				<h4>Order Summary</h4>
				<ul>
				  {cart.map((item) => (
					<li key={item._id}>
					  {item.name} - ${item.price} x {item.quantity}
					</li>
				  ))}
				</ul>
				<p>
				  Subtotal: $
				  {cart
					.reduce(
					  (sum, item) => sum + item.price * item.quantity,
					  0,
					)
					.toFixed(2)}
				</p>
  
				<div className="coupon-section">
				  <input
					type="text"
					placeholder="Enter coupon code"
					value={couponCode}
					onChange={(e) => setCouponCode(e.target.value)}
				  />
				  <button onClick={applyCoupon}>Apply</button>
				</div>
  
				{discount > 0 && (
				  <p className="discount-applied">
					Discount: -${discount.toFixed(2)}
				  </p>
				)}
  
				<p className="final-total">
				  Total: $
				  {(
					cart.reduce(
					  (sum, item) => sum + item.price * item.quantity,
					  0,
					) - discount
				  ).toFixed(2)}
				</p>
  
				<h4>Select Payment Method</h4>
				<div className="payment-methods">
				  <label>
					<input
					  type="radio"
					  value="card"
					  checked={selectedPaymentMethod === "card"}
					  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
					/>
					Credit Card
				  </label>
				  <label>
					<input
					  type="radio"
					  value="paypal"
					  checked={selectedPaymentMethod === "paypal"}
					  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
					/>
					PayPal
				  </label>
				  <label>
					<input
					  type="radio"
					  value="bank_transfer"
					  checked={selectedPaymentMethod === "bank_transfer"}
					  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
					/>
					Bank Transfer
				  </label>
				</div>
				<button onClick={handleConfirmAndPay}>Confirm & Pay</button>
				<button onClick={() => setView("cart")}>Back to Cart</button>
			  </div>
			)}
  
			{view === "orders" && (
			  <div className="orders-section">
				<h3>My Orders</h3>
				{userOrders.length > 0 ? (
				  <div className="orders-list">
					{userOrders.map((order) => (
					  <div key={order.id} className="order-card">
						<div className="order-header">
						  <h4>Order #{order.id.slice(-8)}</h4>
						  <span
							className="order-status"
							style={{ color: getStatusColor(order.status) }}
						  >
							{order.status.toUpperCase()}
						  </span>
						</div>
						<p className="order-date">
						  Placed: {formatDate(order.createdAt)}
						</p>
						<div className="order-payment-status">
						  Payment:{" "}
						  <strong>{order.paymentStatus?.toUpperCase()}</strong>{" "}
						  via {order.paymentMethod}
						</div>
						<div className="order-products">
						  {order.products.map((product, index) => (
							<div key={index} className="order-product">
							  {product.name} x{product.quantity} - $
							  {product.price}
							</div>
						  ))}
						</div>
						<p className="order-total">
						  Total: ${order.totalPrice.toFixed(2)}
						</p>
					  </div>
					))}
				  </div>
				) : (
				  <p>You have no orders yet.</p>
				)}
			  </div>
			)}
  
			{view === "admin-orders" && userData?.role === "admin" && (
			  <div className="admin-orders-section">
				<h3>Manage All Orders</h3>
				{adminOrders.length > 0 ? (
				  <div className="admin-orders-list">
					{adminOrders.map((order) => (
					  <div key={order.id} className="admin-order-card">
						<div className="order-header">
						  <h4>Order #{order.id.slice(-8)}</h4>
						  <div className="order-controls">
							<select
							  value={order.status}
							  onChange={(e) =>
								handleUpdateOrderStatus(order.id, e.target.value)
							  }
							  className="status-select"
							>
							  <option value="pending_payment">
								Pending Payment
							  </option>
							  <option value="pending">Pending</option>
							  <option value="processing">Processing</option>
							  <option value="shipped">Shipped</option>
							  <option value="delivered">Delivered</option>
							  <option value="cancelled">Cancelled</option>
							</select>
						  </div>
						</div>
						<p className="order-customer">
						  Customer: {order.user.email}
						</p>
						<p className="order-date">
						  Placed: {formatDate(order.createdAt)}
						</p>
						<div className="order-products">
						  {order.products.map((product, index) => (
							<div key={index} className="order-product">
							  {product.name} x{product.quantity} - $
							  {product.price}
							</div>
						  ))}
						</div>
						<p className="order-total">
						  Total: ${order.totalPrice.toFixed(2)}
						</p>
					  </div>
					))}
				  </div>
				) : (
				  <p>No orders found.</p>
				)}
			  </div>
			)}
  
			{view === "admin-panel" && userData?.role === "admin" && (
			  <div className="admin-panel">
				<h3>Admin Panel</h3>
  
				<div className="admin-section">
				  <h4>Category Management</h4>
				  <form
					onSubmit={handleCreateCategory}
					className="category-form"
				  >
					<input
					  type="text"
					  placeholder="Category Name"
					  value={newCategoryName}
					  onChange={(e) => setNewCategoryName(e.target.value)}
					  required
					/>
					<textarea
					  placeholder="Category Description (optional)"
					  value={newCategoryDesc}
					  onChange={(e) => setNewCategoryDesc(e.target.value)}
					></textarea>
					<button type="submit">Create Category</button>
				  </form>
				</div>
  
				<button onClick={fetchAdminUserList}>Fetch All Users</button>
				{adminUserList && (
				  <div>
					<h4>All Users List:</h4>
					<pre className="data-preview">
					  {JSON.stringify(adminUserList, null, 2)}
					</pre>
				  </div>
				)}
  
				<form
				  onSubmit={
					editingProduct ? handleUpdateProduct : handleCreateProduct
				  }
				  className="product-form"
				>
				  <h4>
					{editingProduct ? "Edit Product" : "Create New Product"}
				  </h4>
				  <input
					type="text"
					placeholder="Product Name"
					value={newProductName}
					onChange={(e) => setNewProductName(e.target.value)}
					required
				  />
				  <input
					type="number"
					step="0.01"
					placeholder="Price"
					value={newProductPrice}
					onChange={(e) => setNewProductPrice(e.target.value)}
					required
				  />
				  <select
					value={newProductCategory}
					onChange={(e) => setNewProductCategory(e.target.value)}
				  >
					<option value="">Select Category (optional)</option>
					{categories.map((cat) => (
					  <option key={cat._id} value={cat._id}>
						{cat.name}
					  </option>
					))}
				  </select>
				  <textarea
					placeholder="Description"
					value={newProductDesc}
					onChange={(e) => setNewProductDesc(e.target.value)}
					required
				  ></textarea>
				  <div className="form-buttons">
					<button type="submit">
					  {editingProduct ? "Update Product" : "Create Product"}
					</button>
					{editingProduct && (
					  <button type="button" onClick={cancelEdit}>
						Cancel Edit
					  </button>
					)}
				  </div>
				</form>
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
		{error && <p className="error-message">{error}</p>}
	  </main>
	</div>
  );
}

export default App;