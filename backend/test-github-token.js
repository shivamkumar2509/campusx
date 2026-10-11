require("dotenv").config();
const axios = require("axios");

axios
  .get("https://api.github.com/rate_limit", {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
  })
  .then((r) => console.log("Rate limit:", r.data.rate))
  .catch((e) => console.error("Error:", e.response?.data || e.message));
