const crypto = require("crypto");
const API_KEY = process.env.API_KEY || process.env.DUMMY_TOKEN;

function timingSafeMatch(input, expected) {
    const inputBuffer = Buffer.from(input || "", "utf8");
    const expectedBuffer = Buffer.from(expected || "", "utf8");

    if (inputBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function getTokenFromRequest(req) {
    const apiKeyHeader = req.headers["x-api-key"];
    if (typeof apiKeyHeader === "string" && apiKeyHeader.trim()) {
        return apiKeyHeader.trim();
    }

    const authHeader = req.headers.authorization;
    if (typeof authHeader !== "string" || !authHeader.trim()) {
        return null;
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token.trim();
}

function authenticate(req, res, next) {
    if (!API_KEY) {
        return res.status(500).json({ message: "API key is not configured" });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ message: "API key missing" });
    }

    if (!timingSafeMatch(token, API_KEY)) {
        return res.status(401).json({ message: "Invalid API key" });
    }

    next();
}

module.exports = authenticate;
