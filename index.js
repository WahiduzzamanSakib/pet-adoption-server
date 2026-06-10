const express = require('express');
const app = express();
const cors = require('cors');

const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();

        const db = client.db("pet-adoption")
        const petCollection = db.collection("all-pets")

        //GEt/Post/View details Api

        app.get("/pets/user/:email", async (req, res) => {
            const email = req.params.email;

            const result = await petCollection.find({
                ownerEmail: email,
            }).toArray();

            res.send(result);
        });



        app.get('/pets/:id', async (req, res) => {
            const { id } = req.params;

            const result = await petCollection.findOne({
                _id: new ObjectId(id)
            });
            res.json(result);
        });

        app.get('/pets', async (req, res) => {
            const result = await petCollection.find().toArray();
            res.json(result)
        })

        app.post('/pets', async (req, res) => {
            const petData = req.body
            const result = await petCollection.insertOne(petData)
            res.json(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running fine!');
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});