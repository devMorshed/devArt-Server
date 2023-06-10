const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// middleware
const corsOptions = {
	origin: "*",
	credentials: true,
	optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

// verify JWT

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.send({ error: true, message: "You Are Not Authorized" });
	}
	const token = authorization.split(" ")[1];
	jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
		if (error) {
			return res
				.status(401)
				.send({ error: true, message: "Unauthorized" });
		}
		req.decoded = decoded;
		next();
	});
};

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
	const paymentCollection = client.db("devArt").collection("payment");

	app.post("/jwt", (req, res) => {
		console.log("Hitted");
		const user = req.body;
		const token = jwt.sign(user, process.env.TOKEN_SECRET, {
			expiresIn: "1h",
		});

		res.send(token);
	});

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

	app.get("/cart", verifyJWT, async (req, res) => {
		const email = req.query.email;
		if (email !== req.decoded.email) {
			res.send({ error: true, message: "forbidden access" });
		}
		const query = { email, status: "selected" };
		const result = await cartCollection.find(query).toArray();
		res.send(result);
	});

	app.get("/enrolled", verifyJWT, async (req, res) => {
		const email = req.query.email;
		if (email !== req.decoded.email) {
			res.send({ error: true, message: "forbidden access" });
		}
		const query = { email, status: "paid" };
		const result = await cartCollection.find(query).toArray();
		res.send(result);
	});

	app.get("/cart/:id", verifyJWT, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const result = await cartCollection.findOne(query);
		res.send(result);
	});

	app.delete("/cart/:id", verifyJWT, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const result = await cartCollection.deleteOne(query);
		res.send(result);
	});

	app.post("/create-payment-intent", verifyJWT, async (req, res) => {
		const { price } = req.body;
		const amount = parseInt(price * 100);
		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount,
			currency: "usd",
			payment_method_types: ["card"],
		});

		res.send({
			clientSecret: paymentIntent.client_secret,
		});
	});

	// payment related api
	app.post("/payments", verifyJWT, async (req, res) => {
		const payment = req.body;
		const insertResult = await paymentCollection.insertOne(payment);

		const cartfilter = { _id: new ObjectId(payment.cartID) };
		const seatfilter = { _id: new ObjectId(payment.classID) };
		const updatedCart = {
			$set: {
				status: `paid`,
			},
		};

		const updatedSeat = {
			$inc: {
				available_seats: -1,
				enrolled_students: +1,
			},
		};

		const cartResult = await cartCollection.updateOne(
			cartfilter,
			updatedCart
		);
		const seatResult = await classesCollection.updateOne(
			seatfilter,
			updatedSeat
		);

		console.log("cart", cartResult, "seat", seatResult);

		res.send({ insertResult, cartResult, seatResult });
	});

	app.get("/paymenthistory", verifyJWT, async (req, res) => {
		const email = req.query.email;
		if (email !== req.decoded.email) {
			res.status(403).send({
				error: true,
				message: "Unauthorized Access",
			});
		}
		const query = { email: email };
		const sort = { paymentDate: -1 };

		const result = await paymentCollection.find(query).sort(sort).toArray();
		res.send(result);
	});

	// payment

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
