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

function validateUser(user) {
    try {
        const value = userSchema.validateAsync(user);
        return false;
    } catch (error) {
        return error;
    }
}

server.post("/participants", async (req, res) => {
    const userSchema = Joi.object({
        name: Joi.string().trim().required(),
        lastStatus: Joi.date().timestamp().required(),
    });
    const newUser = {
        name: req.body.name,
        lastStatus: Date.now()
    };
    const isValid = validateUser(newUser);
    if(isValid !== false) {
        res.send(error);
        mongoClient.close();
        return;
    }
    try {
        await mongoClient.connect();
        const isRegistered = await db.collection("users").findOne({ name: req.body.name});
        if(isRegistered === null) {
            await db.collection("users").insertOne(newUser);
            res.sendStatus(201);
            mongoClient.close();
        } else {
            res.sendStatus(409);
            mongoClient.close();
        }      
    } catch (error) {
        res.sendStatus(422);
        mongoClient.close();
    }
});


server.listen(process.env.PORT);