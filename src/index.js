import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import Joi from "joi";

dotenv.config();
const server = express();
server.use(cors());
server.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = mongoClient.db("uolDB");

const userSchema = Joi.object({
    name: Joi.string().trim().required(),
    lastStatus: Joi.date().timestamp("javascript"),
});

server.post("/participants", async (req, res) => {
    const newUser = {
        name: req.body.name,
        lastStatus: Date.now()
    };
    try {
        await mongoClient.connect();
        await userSchema.validateAsync(newUser, { abortEarly: false });
        const isRegistered = db.collection("users").findOne(req.body);
        if(isRegistered === null) {
            await db.collection("users").insertOne(newUser);
            res.sendStatus(201);
            mongoClient.close();
            return;
        }
        res.sendStatus(409);
    } catch (error) {
        res.status(422).send(error.details.map(detail => detail.message));
    } finally {
        mongoClient.close();
    }
});


server.listen(process.env.PORT);