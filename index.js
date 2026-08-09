const express = require('express');
const app = express();
const cors = require('cors');

const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

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

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
   
   
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        next();
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" });
    }
};


async function run() {
    try {
        // await client.connect();

        const db = client.db("pet-adoption")
        const petCollection = db.collection("all-pets")


        //request 
        const requestCollection = db.collection("adoption-requests");


        app.patch("/adoption-requests/approve/:petId/:requestId", async (req, res) => {
            const { petId, requestId } = req.params;

            await requestCollection.updateMany(
                { petId },
                { $set: { status: "rejected" } }
            );

            const result = await requestCollection.updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { status: "approved" } }
            );

            res.json(result);
        });


        app.get("/adoption-requests/requester/:email", async (req, res) => {
            const email = req.params.email;

            const result = await requestCollection
                .find({
                    requesterEmail: email
                })
                .toArray();

            res.json(result);
        });

        app.get("/adoption-requests/owner/:email", async (req, res) => {
            const email = req.params.email;

            const result = await requestCollection
                .find({
                    ownerEmail: email
                })
                .toArray();

            res.json(result);
        });

        app.post("/adoption-requests", verifyToken, async (req, res) => {
            const { requesterEmail, ...rest } = req.body;

            const data = {
                ...rest,
                requesterEmail,
                status: "pending",
                createdAt: new Date(),
            };

            const result = await requestCollection.insertOne(data);
            res.json(result);
        });



        //GEt/Post/ Api

        //Delate start
        app.delete('/pets/:id', verifyToken, async (req, res) => {
            const { id } = req.params;

            const result = await petCollection.deleteOne(
                { _id: new ObjectId(id) },
            );
            res.json(result);
        });
        //end


        //petch/Edit
        app.patch('/pets/:id', async (req, res) => {
            const { id } = req.params;
            const updateData = req.body;

            const cleanData = Object.fromEntries(
                Object.entries(updateData).filter(
                    ([_, value]) => value !== "" && value !== undefined && value !== null
                )
            );

            const result = await petCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: cleanData }
            );
            res.json(result);
        });
        //petch


        //my Listins start
        app.get("/pets/user/:email", async (req, res) => {
            const email = req.params.email;

            const result = await petCollection.find({
                ownerEmail: email,
            }).toArray();

            res.send(result);
        });
        //my Listins Closed

        //details
        app.get('/pets/:id', verifyToken, async (req, res) => {
            const { id } = req.params;

            const result = await petCollection.findOne({
                _id: new ObjectId(id)
            });

            res.json(result);
        });
        //details

        //Get pets and Search Api Start
        app.get('/pets', async (req, res) => {
            try {
                const { search, species, sort } = req.query;

                let query = {};

                if (search) {
                    query.petName = {
                        $regex: search,
                        $options: "i"
                    };
                }

                if (species) {
                    query.Species = {
                        $in: species.split(",")
                    };
                }

                let sortOption = {};
                if (sort) {
                    const field = sort.replace("-", "");
                    sortOption[field] = sort.startsWith("-") ? -1 : 1;
                }

                const result = await petCollection
                    .find(query)
                    .sort(sortOption)
                    .toArray();

                res.json(result);

            } catch (error) {
                res.status(500).json({ message: "Server error" });
            }
        });
        //Get pets and Search Api Closed


        app.post('/pets', async (req, res) => {
            const petData = req.body
            const result = await petCollection.insertOne(petData)
            res.json(result)
        })


        // await client.db("admin").command({ ping: 1 });
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