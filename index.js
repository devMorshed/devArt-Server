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

	// geting user role
	app.get("/userrole/:email", verifyJWT, async (req, res) => {
		const email = req.params.email;
		const query = { email: email };
		const user = await usersCollection.findOne(query);
		const result = { role: user?.role };
		res.send(result);
	});

	const verifyAdmin = async (req, res, next) => {
		const email = req.decoded.email;
		const query = { email: email };
		const user = await usersCollection.findOne(query);
		if (user.role !== "admin") {
			res.status(403).send({
				error: true,
				message: "Forbidden Admin Access",
			});
		}
		if (user.role === "admin") {
			next();
		}
	};
	const verifyStudent = async (req, res, next) => {
		const email = req.decoded.email;
		const query = { email: email };
		const user = await usersCollection.findOne(query);
		if (user.role !== "student") {
			res.status(403).send({
				error: true,
				message: "Forbidden Student Access",
			});
		}
		if (user.role === "student") {
			next();
		}
	};
	const verifyInstructor = async (req, res, next) => {
		const email = req.decoded.email;
		const query = { email: email };
		const user = await usersCollection.findOne(query);
		if (user.role !== "instructor") {
			res.status(403).send({
				error: true,
				message: "Forbidden Instructor Access",
			});
		}
		if (user.role === "instructor") {
			next();
		}
	};

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

	app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
		const result = await usersCollection.find().toArray();
		res.send(result);
	});

	app.put("/makeadmin/:id", verifyJWT, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const updatedDOc = {
			$set: {
				role: `admin`,
			},
		};
		const result = await usersCollection.updateOne(query, updatedDOc);
		res.send(result);
	});

	app.put("/makeinstructor/:id", verifyJWT, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const updatedDOc = {
			$set: {
				role: `instructor`,
				enrolled_students: 0,
			},
		};
		const result = await usersCollection.updateOne(query, updatedDOc);
		res.send(result);
	});

	// Get Classes
	app.get("/classes", async (req, res) => {
		const query = { status: "approved" };
		const result = await classesCollection.find(query).toArray();
		res.send(result);
	});

	app.get("/allclass", verifyJWT, verifyAdmin, async (req, res) => {
		const result = await classesCollection.find().toArray();
		res.send(result);
	});

	app.put("/approveclass/:id", verifyJWT, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const updatedDOc = {
			$set: {
				status: `approved`,
			},
		};
		const result = await classesCollection.updateOne(query, updatedDOc);
		res.send(result);
	});

	app.put("/denyclass/:id", verifyJWT, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) };
		const updatedDOc = {
			$set: {
				status: `denied`,
			},
		};
		const result = await classesCollection.updateOne(query, updatedDOc);
		res.send(result);
	});

	app.put("/feedback/:id", verifyJWT, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		console.log("Hitted");
		const query = { _id: new ObjectId(id) };

		const updatedDOc = {
			$set: {
				feedback: req.body.feedback,
			},
    };
    
    console.log(updatedDOc);
		const result = await classesCollection.updateOne(query, updatedDOc);
		res.send(result);
	});

	app.get(
		"/myclass/:email",
		verifyJWT,
		verifyInstructor,
		async (req, res) => {
			const email = req.params.email;
			if (email !== req.decoded.email) {
				res.status(402).send({ error: true, message: "Forbidden" });
			}
			const query = { instructor_mail: email };
			const result = await classesCollection.find(query).toArray();
			res.send(result);
		}
	);

	app.post(
		"/classes/:email",
		verifyJWT,
		verifyInstructor,
		async (req, res) => {
			const email = req.params.email;
			console.log("object");
			if (email !== req.decoded.email) {
				res.status(402).send({ error: true, message: "Forbidden" });
			}
			const classDoc = req.body;
			const result = await classesCollection.insertOne(classDoc);
			res.send(result);
		}
	);

	app.get("/popularclasses", async (req, res) => {
		const sort = { enrolled_students: -1 };
		const result = (
			await classesCollection.find().sort(sort).toArray()
		).slice(0, 6);
		res.send(result);
	});

	// Get Instructors
	app.get("/instructors", async (req, res) => {
		const query = { role: "instructor" };
		const result = await usersCollection.find(query).toArray();
		res.send(result);
	});

	app.get("/popularinstructors", async (req, res) => {
		const query = { role: "instructor" };
		const sort = { enrolled_students: -1 };
		const result = (
			await usersCollection.find(query).sort(sort).toArray()
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
		console.log("hitted");
		const email = req.query.email;
		if (email !== req.decoded.email) {
			res.send({ error: true, message: "forbidden access" });
		}
		const query = { user_email: email, status: "selected" };
		const result = await cartCollection.find(query).toArray();
		console.log(result);
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
		const instructorFilter = { email: payment.instructor_mail };

		console.log(instructorFilter);

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

		const updateInstructor = {
			$inc: {
				enrolled_students: +1,
			},
		};

		const insOption = {
			upsert: true,
		};

		const cartResult = await cartCollection.updateOne(
			cartfilter,
			updatedCart
		);
		const seatResult = await classesCollection.updateOne(
			seatfilter,
			updatedSeat
		);

		const InsResult = await usersCollection.updateOne(
			instructorFilter,
			updateInstructor,
			insOption
		);

		console.log("cart", cartResult, "seat", seatResult);

		res.send({ insertResult, cartResult, seatResult, InsResult });
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
