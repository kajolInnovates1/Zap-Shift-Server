const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const dotenv = require("dotenv");


dotenv.config();

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

        app.get("/parcels", async (req, res) => {
            const parcels = await parcelsCollection.find().toArray();
            res.send(parcels);
        });

        //parcel data geting

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
