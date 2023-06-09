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
	const classesCollection = client.db("devArt").collection("classes");
	const instructorsCollection = client.db("devArt").collection("instructors");
	const cartCollection = client.db("devArt").collection("cart");

	app.post("/user/:email", async (req, res) => {
		const user = req.body;
		const query = { email: req.params.email };
		const existinguser = await usersCollection.findOne(query);
		if (existinguser) {
			return res.send("User Alredy Existed");
		}
		const result = await usersCollection.insertOne(user);
		res.send(result);
	});

	// Get Classes
	app.get("/classes", async (req, res) => {
		const result = await classesCollection.find().toArray();
		res.send(result);
	});

	app.get("/popularclasses", async (req, res) => {
		const sort = { enrolled_students: -1 };
		const result = (
			await classesCollection.find().sort(sort).toArray()
		).slice(0, 6);
		res.send(result);
	});

	// Get Instructors
	app.get("/instructors", async (req, res) => {
		const result = await instructorsCollection.find().toArray();
		res.send(result);
	});

	app.get("/popularinstructors", async (req, res) => {
		const sort = { enrolled_students: -1 };
		const result = (
			await instructorsCollection.find().sort(sort).toArray()
		).slice(0, 6);
		res.send(result);
	});

	// Cart related API's

	app.post("/cart/:email", async (req, res) => {
		const cartItem = req.body;
		const result = await cartCollection.insertOne(cartItem);
		res.send(result);
	});

	app.get("/cart", async (req, res) => {
		const email = req.query.email;
		const query = { email: email };
		const result = await cartCollection.find(query).toArray();
		res.send(result);
	});

	app.delete("/cart/:id", async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const result = await cartCollection.deleteOne(query);
		res.send(result);
	});

	// Send a ping to confirm a successful connection
	await client.db("admin").command({ ping: 1 });
	console.log("Connected to MongoDB!");
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("devArt Server is running..");
});

app.listen(port, () => {
	console.log(`devArt is running on port ${port}`);
});
