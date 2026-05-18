require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth.routes");
const childRoutes = require("./src/routes/child.routes");
const mealplanRoutes = require("./src/routes/mealplan.routes");
const mpasiRoutes = require("./src/routes/mpasi.routes");
const growthRoutes = require("./src/routes/growth.routes");
const chatbotRoutes = require("./src/routes/chatbot.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend Nutriby jalan 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/children", childRoutes);
app.use("/api/mealplans", mealplanRoutes); 
app.use("/api/mpasi", mpasiRoutes);       
app.use("/api/growth", growthRoutes);  
app.use("/api/bot", chatbotRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});