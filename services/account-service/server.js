const express = require("express");
const verifyAuthToken = require("./middleware/auth-middleware");

const app = express();
const PORT = 3001;

app.use(express.json());


app.get("/api/users/me", verifyAuthToken, (req, res) => {
  
  console.log("[Account Service] GET /api/users/me request received!");

  res.status(200).json({
    message: "Token is valid. This is your user data from the token.",
    userData: req.user,
  });
});

app.listen(PORT, () => {
  console.log(`[Account Service] Running on port ${PORT}`);
});