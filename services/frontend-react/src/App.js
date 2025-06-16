import React, { useState, useEffect } from "react";
import axios from "axios";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

const API_GATEWAY_URL = process.env.REACT_APP_API_URL || "";

function App() {
	const [user, setUser] = useState(null);
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showLogin, setShowLogin] = useState(true);
	const [products, setProducts] = useState([]);
	const [adminUserList, setAdminUserList] = useState(null);
	const [error, setError] = useState("");

	const [newProductName, setNewProductName] = useState("");
	const [newProductPrice, setNewProductPrice] = useState("");
	const [newProductDesc, setNewProductDesc] = useState("");

	const [editingProduct, setEditingProduct] = useState(null);

	const fetchProducts = async () => {
		try {
			const response = await axios.get(`${API_GATEWAY_URL}/api/products`);
			setProducts(response.data);
		} catch (err) {
			setError("Could not fetch products.");
		}
	};

	useEffect(() => {
		const fetchAndSetUserData = async (firebaseUser) => {
			try {
				const idToken = await firebaseUser.getIdToken(true);
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
				console.error(err);
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
				fetchAndSetUserData(currentUser).finally(() =>
					setLoading(false),
				);
			}
		});

		fetchProducts();
		return () => unsubscribe();
	}, []);

	const handleLogout = async () => {
		await signOut(auth);
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
			setProducts(products.filter((p) => p._id !== productId));
		} catch (err) {
			setError("Failed to delete product.");
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
			};
			await axios.post(`${API_GATEWAY_URL}/api/products`, newProduct, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			setNewProductName("");
			setNewProductPrice("");
			setNewProductDesc("");
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
			};
			const response = await axios.put(
				`${API_GATEWAY_URL}/api/products/${editingProduct._id}`,
				updatedData,
				{
					headers: { Authorization: `Bearer ${idToken}` },
				},
			);
			setProducts(
				products.map((p) =>
					p._id === editingProduct._id ? response.data : p,
				),
			);
			setEditingProduct(null);
			setNewProductName("");
			setNewProductPrice("");
			setNewProductDesc("");
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
	};

	const cancelEdit = () => {
		setEditingProduct(null);
		setNewProductName("");
		setNewProductPrice("");
		setNewProductDesc("");
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
							Hello, <strong>{getUsername(user.email)}</strong>!
							(Role: {userData.role})
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
								<button onClick={fetchAdminUserList}>
									Fetch All Users
								</button>
								{adminUserList && (
									<div>
										<h4>All Users List:</h4>
										<pre className="data-preview">
											{JSON.stringify(
												adminUserList,
												null,
												2,
											)}
										</pre>
									</div>
								)}

								<form
									onSubmit={
										editingProduct
											? handleUpdateProduct
											: handleCreateProduct
									}
									className="product-form"
								>
									<h4>
										{editingProduct
											? "Edit Product"
											: "Create New Product"}
									</h4>
									<input
										type="text"
										placeholder="Product Name"
										value={newProductName}
										onChange={(e) =>
											setNewProductName(e.target.value)
										}
										required
									/>
									<input
										type="number"
										step="0.01"
										placeholder="Price"
										value={newProductPrice}
										onChange={(e) =>
											setNewProductPrice(e.target.value)
										}
										required
									/>
									<textarea
										placeholder="Description"
										value={newProductDesc}
										onChange={(e) =>
											setNewProductDesc(e.target.value)
										}
										required
									></textarea>
									<div className="form-buttons">
										<button type="submit">
											{editingProduct
												? "Update Product"
												: "Create Product"}
										</button>
										{editingProduct && (
											<button
												type="button"
												onClick={cancelEdit}
											>
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
									<p>{product.description}</p>
									<p className="price">
										${product.price.toFixed(2)}
									</p>
									{user && userData?.role === "admin" && (
										<div className="admin-buttons">
											<button
												className="edit-button"
												onClick={() =>
													handleEditClick(product)
												}
											>
												Edit
											</button>
											<button
												className="delete-button"
												onClick={() =>
													handleDeleteProduct(
														product._id,
													)
												}
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
				{error && <p className="error-message">{error}</p>}
			</main>
		</div>
	);
}

export default App;