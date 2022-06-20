import express from "express";
import main from "./main";

interface dotenv_config {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
}

const env_vars = process.env as NodeJS.ProcessEnv & Partial<dotenv_config>;

const client_id = env_vars.CLIENT_ID || "";
const client_secret = env_vars.CLIENT_SECRET || "";

if (!client_id)
    throw "NO CLIENT ID";
if (!client_secret)
    throw "NO CLIENT SECRET";

const router = express.Router();

router.get("/", (req, res) => {
    const status = req.query.status as unknown as string || null;

    res.status(200);

    if (status === "success") {
        res.json("Login success, you may close this window.");
    } else if (status === "error") {
        res.json("Access denied, you may close this window.");
    } else {
        res.json("What are you doing here?");
    }
});

router.get("/callback", (req, res) => {
    // What?
    const code = req.query.code as unknown as string || null

    if (code === null) {
        res.redirect("/?status=error");
    } else {
        res.redirect("/?status=success");

        main({ auth: { code, client_id, client_secret } });
    }
});

router.get("/login", (req, res) => {
    const scope = "user-read-recently-played";

    const urlParams = {
        response_type: "code",
        client_id: client_id,
        scope,
        redirect_uri: "http://localhost:8101/callback",
    };

    const urlParamString = (new URLSearchParams(urlParams)).toString();

    res.redirect("https://accounts.spotify.com/authorize?" + urlParamString);
});

export default router;
export { router };