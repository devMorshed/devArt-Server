import { app } from "./app";
require("dotenv").config();



// Server creation
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
