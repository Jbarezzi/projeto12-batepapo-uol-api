import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import Joi from "joi";
import dayjs from "dayjs";

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

const messageSchema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required(),
    time: Joi.string().required(),
})

server.post("/participants", async (req, res) => {
    const newUser = {
        name: req.body.name,
        lastStatus: Date.now()
    };
    try {
        await mongoClient.connect();
        await userSchema.validateAsync(newUser, { abortEarly: false });
        const isRegistered = await db.collection("users").findOne(req.body);
        if(isRegistered === null) {
            const newUserMessage = {
                from: newUser.name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().format("HH:mm:ss"),
            }
            await db.collection("users").insertOne(newUser);
            await db.collection("messages").insertOne(newUserMessage)
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