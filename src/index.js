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

server.post("/participants", async (req, res) => {
    const newUser = {
        name: req.body.name,
        lastStatus: Date.now()
    };
    try {
        await mongoClient.connect();
        const userSchema = Joi.object({
            name: Joi.string().trim().required(),
            lastStatus: Joi.date().timestamp("javascript"),
        });
        await userSchema.validateAsync(newUser, { abortEarly: false });
        const isRegistered = await db.collection("users").findOne({ name: newUser.name });
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

server.get("/participants", async (_req, res) => {
    await mongoClient.connect();
    const usersOn = await db.collection("users").find().toArray();
    res.send(usersOn);
    mongoClient.close();
});

server.post("/status", async (req, res) => {
    const user = req.headers.user;
    try {
        await mongoClient.connect();
        await db.collection("users").updateOne({ name: user }, { $set: { lastStatus: Date.now() }});
        res.sendStatus(200);
    } catch(error) {
        res.sendStatus(409);
    } finally {
        mongoClient.close();
    }
});

server.post("/messages", async (req, res) => {
    const message = {
        from: req.headers.user,
        ...req.body,
        time: dayjs().format("HH:mm:ss"),
    };
    try {
        await mongoClient.connect();
        const validationName = await db.collection("users").findOne({ name: message.from });
        const messageSchema = Joi.object({
            from: Joi.any().valid(validationName.name),
            to: Joi.string().trim().required(),
            text: Joi.string().trim().required(),
            type: Joi.any().valid("message", "private_message"),
            time: Joi.string().required(),
        })
        await messageSchema.validateAsync(message,  { abortEarly: false });
        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch(error) {
        res.status(422).send(error.details.map(detail => detail.message));
    } finally {
        mongoClient.close();
    }
});

server.get("/messages", async (req, res) => {
    const user = req.headers.user;
    let { limit } = req.query;
    limit = limit ? parseInt(limit) : 0;
    await mongoClient.connect();
    const messages = await db.collection("messages").find( { $or: [
        { to: 'Todos' },
        { type: 'message' },
        { from: user },
        { to: user },
      ], }).sort({ time: -1 }).limit(limit).toArray();
      messages.reverse();
    res.send(messages);
});

async function checkIfUserIsOnline() {
    const logoutTime = Date.now() - 10000;
    await mongoClient.connect();
    const usersToDelete = await db.collection("users").find({ lastStatus: {$lt: logoutTime}}).toArray();
    for(let user of usersToDelete) {
        await db.collection("users").deleteOne({ name: user.name });
        await db.collection("messages").insertOne({ from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format("HH:mm:ss") })
    }
    mongoClient.close();
}

setInterval(checkIfUserIsOnline, 15000);


server.listen(process.env.PORT);