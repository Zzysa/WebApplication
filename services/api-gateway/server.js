const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 8000;

app.use(cors({ origin: "http://localhost:3000" }));

const USER_SERVICE_URL = "http://account-service:3001";

app.use("/api/auth", async (req, res) => {
  try {
    console.log(
      `[API Gateway] Proxying AUTH request to User Service: ${req.method} ${req.originalUrl}`,
    );
    const url = `${USER_SERVICE_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        Authorization: req.headers.authorization,
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "[API Gateway] Error proxying AUTH to User Service:",
      error.message,
    );
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: "Proxy error" });
    }
  }
});

app.use("/api/users", async (req, res) => {
  try {
    console.log(
      `[API Gateway] Proxying USER request to User Service: ${req.method} ${req.originalUrl}`,
    );
    const url = `${USER_SERVICE_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        Authorization: req.headers.authorization,
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "[API Gateway] Error proxying USER to User Service:",
      error.message,
    );
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: "Proxy error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port ${PORT}`);
});