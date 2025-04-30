import rateLimit from "express-rate-limit";
import config from "../config.json" with { type: "json" };

const { MAX_READ_REQUESTS, MAX_WRITE_REQUESTS, RATE_LIMIT_WINDOW } = config;

// para requisições de escrita no express
export const apiWriteLimit = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: MAX_WRITE_REQUESTS,
    message:
        "Você excedeu o limite de requisições de leitura permitidas, tente novamente mais tarde.",
    standardHeaders: true,
    legacyHeaders: false,
});

// para requisições de leitura no express
export const apiReadLimit = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: MAX_READ_REQUESTS,
    message:
        "Você excedeu o limite de requisições de escrita permitidas, tente novamente mais tarde.",
    standardHeaders: true,
    legacyHeaders: false,
});
