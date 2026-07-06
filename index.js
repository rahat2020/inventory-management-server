const express = require("express");
const mongoose = require("mongoose");
const app = express();
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 5000;
const errorHandler = require("./middlware/errorHandler");
const authRoute = require("./routes/users");
const productsRoute = require("./routes/products");
const categoryRoute = require("./routes/category");
const chatRoute = require("./routes/chat");

const mongoUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vatpd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
console.log(mongoUrl);
mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("database connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

// API
app.use(cors());
app.use(express.json());
app.use("/api/v1", authRoute);
app.use("/api/v1", productsRoute);
app.use("/api/v1", categoryRoute);
app.use("/api", chatRoute);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./index.html"));
});
app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
