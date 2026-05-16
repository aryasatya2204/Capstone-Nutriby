require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth.routes");
const childRoutes = require("./src/routes/child.routes");
const mealplanRoutes = require("./src/routes/mealplan.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend Nutriby jalan 🚀");
});

app.use("/api/auth", authRoutes);
// 2. Gunakan route child di sini
app.use("/api/children", childRoutes);
app.use("/api/mealplans", mealplanRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});