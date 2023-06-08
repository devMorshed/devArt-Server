const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
	origin: "*",
	credentials: true,
	optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_ACCESS_SECRET;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	const usersCollection = client.db("devArt").collection("users");

	// Send a ping to confirm a successful connection
	await client.db("admin").command({ ping: 1 });
	console.log(
		"Connected to MongoDB!"
	);
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("devArt Server is running..");
});

app.listen(port, () => {
	console.log(`devArt is running on port ${port}`);
});
