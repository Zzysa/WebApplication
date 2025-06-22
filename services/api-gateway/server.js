const express = require("express");
const cors = require("cors");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const checkAdmin = require("./middleware/checkAdmin.js");

const app = express();
const PORT = 8000;

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
});

const whitelist = [
	"http://localhost:3000",
	"http://localhost",
	"http://microshop.local",
    "http://localhost:9003",
];

const corsOptions = {
	origin: function (origin, callback) {
		callback(null, true);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use(limiter);
app.use(helmet());
app.use(express.json());

const USER_SERVICE_URL = "http://account-service:3001";

app.use("/api/payments", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({
			method: req.method,
			url,
			data: req.body,
			headers: { Authorization: req.headers.authorization },
		});
		res.status(response.status).json(response.data);
	} catch (error) {
		next(error);
	}
});

const PRODUCT_SERVICE_URL = "http://product-service:3002";

app.use("/api/auth", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({ method: req.method, url, data: req.body, headers: req.headers });
		res.status(response.status).json(response.data);
	} catch (error) { next(error); }
});

app.use("/api/users", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({ 
			method: req.method, 
			url, 
			data: req.body, 
			headers: {
				...req.headers,
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			},
			validateStatus: function (status) {
				return status >= 200 && status < 500;
			}
		});
		
		if (response.status === 304) {
			return res.status(200).json({ 
				message: "User data not modified", 
				cached: true 
			});
		}
		
		res.status(response.status).json(response.data);
	} catch (error) { 
		console.error("[API Gateway] Users error:", error.response?.data || error.message);
		next(error); 
	}
});

app.use("/api/orders", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({
			method: req.method,
			url,
			data: req.body,
			headers: { Authorization: req.headers.authorization },
		});
		res.status(response.status).json(response.data);
	} catch (error) {
		next(error);
	}
});

app.use("/api/admin", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({
			method: req.method,
			url,
			data: req.body,
			headers: { Authorization: req.headers.authorization },
		});
		res.status(response.status).json(response.data);
	} catch (error) {
		next(error);
	}
});

app.use("/api/categories",
    (req, res, next) => {
        if (req.method === "GET") {
            return next();
        }
        checkAdmin(req, res, next);
    },
    async (req, res, next) => {
        try {
            const url = `${PRODUCT_SERVICE_URL}${req.originalUrl}`;
            const response = await axios({
                method: req.method,
                url: url,
                data: req.body,
            });
            res.status(response.status).json(response.data);
        } catch (error) {
            next(error);
        }
    }
);

app.use("/api/products",
    (req, res, next) => {
        if (req.method === "GET") {
            return next();
        }
        checkAdmin(req, res, next);
    },
    async (req, res, next) => {
        try {
            const url = `${PRODUCT_SERVICE_URL}${req.originalUrl}`;
            const response = await axios({
                method: req.method,
                url: url,
                data: req.body,
            });
            res.status(response.status).json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                next(error);
            }
        }
    }
);

app.use("/api/coupons", async (req, res, next) => {
	try {
	  const url = `http://product-service:3002${req.originalUrl}`;
	  const response = await axios({
		method: req.method,
		url,
		data: req.body,
	  });
	  res.status(response.status).json(response.data);
	} catch (e) {
	  next(e);
	}
});

app.use("/api/cart", async (req, res, next) => {
	try {
		const url = `${USER_SERVICE_URL}${req.originalUrl}`;
		const response = await axios({
			method: req.method,
			url,
			data: req.body,
			headers: { Authorization: req.headers.authorization },
		});
		res.status(response.status).json(response.data);
	} catch (error) {
		next(error);
	}
});

app.use((err, req, res, next) => {
	console.error(`[API Gateway Error] ${req.method} ${req.originalUrl}:`, err.message);
	if (err.response) {
		console.error(`[API Gateway Error] Response status: ${err.response.status}`);
		console.error(`[API Gateway Error] Response data:`, err.response.data);
		return res.status(err.response.status).json(err.response.data);
	}
	res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
	console.log(`[API Gateway] Running on port ${PORT}`);
});