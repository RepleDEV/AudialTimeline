// First, read ENV
import dotenv from "dotenv";
dotenv.config();

const env_vars = process.env as NodeJS.ProcessEnv & Partial<{ PORT: string }>;

const PORT = env_vars.PORT || 8000;

import express from "express";

const app = express();

// Setup express
app.use(express.json());

// Router
import router from "./routes";
app.use(router);

import open from "open";

app.listen(PORT, () => {
    console.log(`App listening on port: ${PORT}`);
    console.log("Redirecting to Spotify login...")
    open("http://localhost:8101/login");
});