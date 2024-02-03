import { app } from "./app";
require("dotenv").config();

// testing route
app.get("/test", (req, res, next) => {
  return res.json({ message: "Test route working" });
});

// Server creation
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
