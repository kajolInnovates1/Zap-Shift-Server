const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const dotenv = require("dotenv");


dotenv.config();

const stripe = require("stripe")(process.env.SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

//
// 

// MongoDB URI

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2t9ng6r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db("parcelDB");
        const parcelsCollection = db.collection("parcels");
        const transactionCollection = db.collection("transaction");

        app.get("/parcels", async (req, res) => {
            const parcels = await parcelsCollection.find().toArray();
            res.send(parcels);
        });

        //get All data OR Using any Specific email

        app.get("/parcels", async (req, res) => {
            try {
                const email = req.query.email;
                const query = email ? { created_by: email } : {}; // Match with your field name

                const parcels = await parcelsCollection
                    .find(query)
                    .sort({ creation_date: -1 }) // Sort by newest creation_date
                    .toArray();

                res.send(parcels);
            } catch (error) {
                console.error("Failed to get parcels:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });

        // Get Data to usign ID

        app.get("/parcels/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const parcel = await parcelsCollection.findOne({ _id: new ObjectId(id) });

                if (!parcel) {
                    return res.status(404).send({ message: "Parcel not found" });
                }

                res.send(parcel);
            } catch (error) {
                console.error("Failed to get parcel by id:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });


        //    insert Data to any form
        app.post("/parcels", async (req, res) => {
            const parcel = req.body;
            const result = await parcelsCollection.insertOne(parcel);
            res.send(result);
        });


        app.delete("/parcels/:id", async (req, res) => {
            try {
                const id = req.params.id;  // Get parcel ID from URL param
                const result = await parcelsCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).send({ message: "Parcel deleted successfully" });
                } else {
                    res.status(404).send({ message: "Parcel not found" });
                }
            } catch (error) {
                console.error("Failed to delete parcel:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });


        //get the api on transaction history

        app.get("/transactions", async (req, res) => {
            try {
                const email = req.query.email;
                const query = email ? { email } : {}; // if email query exists, filter by email

                const transactions = await transactionCollection
                    .find(query)
                    .sort({ date: -1 }) // latest first
                    .toArray();

                res.status(200).send(transactions);
            } catch (error) {
                console.error("Failed to get transactions:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });



        // after Confirm to payment store transaction  update payment status

        app.post("/transactions", async (req, res) => {
            try {
                const transactionData = req.body; // contains parcelId and payment info
                const { parcelId, email, amount, paymentMethod, transactionId } = transactionData;

                const transaction = {
                    parcelId: new ObjectId(parcelId),
                    email,
                    amount,
                    paymentMethod,
                    transactionId,
                    status: "success",
                    date: new Date()
                };

                const transactionResult = await transactionCollection.insertOne(transaction);
                // Update payment status in parcel
                const updateResult = await parcelsCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    { $set: { payment_status: "paid" } }
                );

                if (transactionResult.insertedId && updateResult.modifiedCount === 1) {
                    res.status(200).send({
                        message: "Transaction stored and parcel payment status updated",
                        transactionId: transactionResult.insertedId
                    });
                } else {
                    res.status(400).send({ message: "Transaction or parcel update failed" });
                }
            } catch (error) {
                console.error("Transaction error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });



        // confirm payment checkout

        app.post('/create-payment-intent', async (req, res) => {
            const amountIncents = req.body.amountParcel;
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountIncents,
                    currency: 'usd',
                });
                res.status(200).json({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Parcel server running");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
