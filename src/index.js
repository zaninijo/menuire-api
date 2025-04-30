import { ProtectedService, readMenuData, matchMenuRoute } from "./firestore.js";
import { apiWriteLimit, apiReadLimit } from "./ratelimit.js";
import config from "../config.json" with { type:"json" };
import express from "express";
import cors from "cors";

const { MAX_WRITE_SIZE, MAX_URL_LENGTH, MAX_IMAGE_SIZE } = config;
const allowedOrigins = config.CORS_ORIGIN;

const app = express();
app.use(limitUrlLenght);
app.use(cors({origin: allowedOrigins}));

const menuRouter = express.Router();
menuRouter.use(express.json({ limit: MAX_WRITE_SIZE }));

const itemImageRouter = express.Router();
itemImageRouter.use(express.text({ limit: MAX_IMAGE_SIZE }))

const listEndpoints = (app) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                method: Object.keys(middleware.route.methods)[0].toUpperCase(),
                path: middleware.route.path,
            });
        }
    });
    return routes;
};

async function protectedService(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        return res.status(401).send("Acesso negado.");
    }

    const token = authorizationHeader.split("Bearer ")[1];

    const service = await ProtectedService.create(token);

    if (!service) {
        return res.status(401).send("Acesso negado.");
    }
    req.protectedService = service;
    next();
}

function limitUrlLenght(req, res, next) {
    const maxUrlLength = MAX_URL_LENGTH;
    if (req.originalUrl.length > maxUrlLength) {
        return res
            .status(414)
            .send("O URI ultrapassou o limite de caracteres para o processamento");
    }
    next();
}

// Retorna todos os endpoints

app.get("/", (req, res) => {
    const endpoints = listEndpoints(app);
    res.status(200).json(endpoints);
});

// Endpoints de leitura //

// Retorna os dados do menu
app.get("/menu/:menuId", apiReadLimit, async (req, res) => {
    try {
        const rr = await readMenuData(req.params["menuId"])
        res.status(rr.code).json(rr.data);

    } catch (error) {
        console.log("Erro ao ler o menu:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Encontra o cardápio que corresponde a rota
app.get("/match-route/:routeName", apiReadLimit, async (req, res) => {
    try {
        const rr = await matchMenuRoute(req.params["routeName"]);
        res.status(rr.code).json(rr.data);

    } catch (error) {
        console.log("Erro ao encontrar ao encontrar a rota:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Retorna todos os cardápios de um usuário
app.get("/user-menus/:userId", protectedService, apiReadLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.getMenuFromUid(req.params["userId"])
        res.status(rr.code).json(rr.data);

    } catch (error) {
        console.log("Erro ao retornar os cardápios do usuário:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Endpoints de escrita //

// Cria um novo cardápio e retorna seu id
menuRouter.post("/menu", protectedService, apiWriteLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.addMenuData(req.body);
        res.status(rr.code).json(rr.data);
    } catch (error) {
        console.log("Erro ao criar o menu:", error.code, error.message);
        res.status(error.code).send(error.message);
    }
});

// Atualiza os dados de um cardápio (overwrite)
menuRouter.put("/menu/:menuId", protectedService, apiWriteLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.updateMenuData(req.params["menuId"], req.body);
        res.status(rr.code).send(rr.data);

    } catch (error) {
        console.log("Erro ao atualizar o menu:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Deleta os dados de um cardápio
app.delete("/menu/:menuId", protectedService, apiWriteLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.deleteMenuData(req.params["menuId"]);
        res.status(rr.code).send(rr.data);

    } catch (error) {
        console.log("Erro ao deletar o menu:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Adiciona uma imagem em um item do cardápio
itemImageRouter.post("/item-image/:menuId", protectedService, apiWriteLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.addMenuItemImage(req.params["menuId"], req.body);
        res.status(rr.code).send(rr.data);

    } catch (error) {
        console.log("Erro ao adicionar a imagem:", error.message);
        res.status(error.code).send(error.message);
    }
});

// Deleta a imagem que corresponde ao itemIndex
itemImageRouter.delete("/item-image/:menuId/:imageId", protectedService, apiWriteLimit, async (req, res) => {
    try {
        const service = req.protectedService;
        const rr = await service.deleteMenuItemImage(req.params["menuId"], req.params["imageId"]);
        res.status(rr.code).send(rr.data);

    } catch (error) {
        console.log("Erro ao deletar a imagem:", error.message);
        res.status(error.code).send(error.message);
    }
});

app.use("/", menuRouter);
app.use("/", itemImageRouter);

app.listen(5001, () => console.log("Servidor rodando na porta 5001!"));
