const express = require("express");
const cors = require("cors");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const checkAdmin = require("./middleware/auth-middleware.js");


const app = express();
const PORT = 8000;

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
});

const whitelist = ["http://localhost:3000", "http://localhost", "http://microshop.local"];
const corsOptions = {
	origin: function (origin, callback) {
		if (!origin || whitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,
};

app.use(limiter);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

const USER_SERVICE_URL = "http://account-service:3001";
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
		const response = await axios({ method: req.method, url, data: req.body, headers: req.headers });
		res.status(response.status).json(response.data);
	} catch (error) { next(error); }
});


app.use("/api/products",
    (req, res, next) => {
        // GET-запросы пропускаем без проверки
        if (req.method === "GET") {
            return next();
        }
        // Для POST, PUT, DELETE - запускаем проверку
        checkAdmin(req, res, next);
    },
    async (req, res, next) => {
        // Этот блок выполняется, только если checkAdmin вызвал next()
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

app.use((err, req, res, next) => {
	console.error("[API Gateway Error]", err);
	if (err.response) {
		return res.status(err.response.status).json(err.response.data);
	}
	if (err.status) {
		return res.status(err.status).json({ message: err.message });
	}
	res.status(500).json({ message: "Internal Gateway Error" });
});


app.listen(PORT, () => {
	console.log(`[API Gateway] Running on port ${PORT}`);
});