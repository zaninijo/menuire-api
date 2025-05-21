import admin from "firebase-admin";
import serviceAccount from "../firebaseCredentials.json" with { type: "json" };
import sampleData from "../sample_data.json" with { type: "json" };
import { dataValidator, generateId, isValidBase64, isObjectEmpty, RequestError, RequestResponse } from "./utils.js";
import config from "../config.json" with { type:"json" };
const { MAX_MENU_ITEMS, MAX_MENU_SEPARATORS } = config;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore().collection("menuData");

/*
Por falta de alternativas melhores, as imagens serão gravadas no firestore também. Para isso, elas deverão ser
comprimidas e transformadas em base64 (cujo processamento é no front-end)
*/
const imagedb = admin.firestore().collection("menuImage");

function protectedServiceUninitialized() {
    return new RequestError(
        500,
        "Não é possível acessar os métodos de ProtectedService sem inicializar corretamente."
    );
}

// Não é possivel inicializar a classe diretamente. Para isso, utilizaremos o método estático create.
class ProtectedService {
    constructor(token, user = null) {
        this.token = token;
        this.user = user;
    }

    static async create(token) {
        try {
            const user = await admin.auth().verifyIdToken(token);
            return new ProtectedService(token, user);
        } catch (error) {
            throw new RequestError(401, "O usuário não pôde ser validado");
        }
    }

    async addMenuData(menuData) {
        if (isObjectEmpty(menuData)) throw new RequestError(400, "menuData nulo");
        if (!this.user) throw protectedServiceUninitialized();
        if (menuData.items.length > MAX_MENU_ITEMS)
            throw new RequestError(422, `O limite de itens por menu é ${MAX_MENU_ITEMS}`);
        if (menuData.separators.length > MAX_MENU_SEPARATORS)
            throw new RequestError(422, `O limite de separadores por menu é ${MAX_MENU_SEPARATORS}`);

        const menuDataOwner = menuData.owner;
        const userId = this.user.uid;

        if (menuDataOwner !== userId)
            throw new RequestError(422, `O campo owner do menuData ${menuDataOwner} não corresponde ao id do usuário atual ${userId}`);

        // Acho que rodar queries para criar itens pode ser ruim ao longo prazo

        if (!menuData.route) {
            throw new RequestError(422, "O MenuData não contém um route.")
        }

        if (await menuRouteExists(menuData.route))
            throw new RequestError(409, "Já existe um menu catalogado na route especificada");

        const docRef = await db.add(
            dataValidator(menuData, sampleData)
        );
        const menuId = docRef.id;

        // Cria um documento para armazenar as imagens
        await imagedb.doc(menuId).set({
            owner: userId
        });
        
        return new RequestResponse(200, { menuId: menuId });
    }

    async deleteMenuData(menuId) {
        if (!menuId) throw new RequestError(400, "menuId nulo");
        if (!this.user) throw protectedServiceUninitialized();

        const docRef = db.doc(menuId);
        const doc = await docRef.get();

        const userId = this.user.uid;

        if (!doc.exists)
            throw new RequestError(404, `Menu de id "${userId}" não existe.`);

        // verifica ownership sobre o menu que será atualizado
        const menuOwnerId = doc.data().owner;
        if (userId !== menuOwnerId)
            throw new RequestError(
                403,
                `O usuário "${userId}" não é dono do menu "${menuId}".`
            );

        const imagesRef = imagedb.doc(menuId);
        // Deleta todos os documentos da subcoleção imageCollection
        const imagesSnap = await imagesRef.collection("imageCollection").get();
        const deleteImagePromises = imagesSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteImagePromises);

        // Deleta o documento do menu
        await menuRef.delete();

        docRef.delete();

        return new RequestResponse(200);
    }

    async updateMenuData(menuId, menuData) {
        if (!(menuId || !isObjectEmpty(menuData)))
            throw new RequestError(400, "menuId e/ou menuData nulos");
        if (!this.user) throw protectedServiceUninitialized();
        if (menuData.items.length > MAX_MENU_ITEMS)
            throw new RequestError(422, `O limite de itens por menu é ${MAX_MENU_ITEMS}`);
        if (menuData.separators.length > MAX_MENU_SEPARATORS)
            throw new RequestError(422, `O limite de separadores por menu é ${MAX_MENU_SEPARATORS}`);

        const docRef = db.doc(menuId);
        const doc = await docRef.get();
        const docData = doc.data();

        const menuDataOwner = menuData.owner;
        const userId = this.user.uid;
        const previousRoute = docData.route;

        if (menuDataOwner !== userId)
            throw new Error(
                `O campo owner do menuData ${menuDataOwner} não corresponde ao id do usuário ${userId}`
            );

        // Acho que rodar queries para alterar itens pode ser ruim ao longo prazo
        if (
            menuData.route &&
            menuData.route !== previousRoute &&
            (await matchMenuRoute(menuData.route))
        ) {
            throw new RequestError(
                409,
                "Já existe um menu catalogado na route especificada"
            );
        }

        if (!doc.exists)
            throw new RequestError(404, `Menu de id "${menuId}" não existe.`);

        // Verifica ownership sobre o menu que será atualizado
        const menuOwnerId = docData.owner;
        if (userId !== menuOwnerId)
            throw new RequestError(
                403,
                `O usuário "${userId}" não é dono do menu "${menuId}".`
            );

        const valitedData = dataValidator(menuData, sampleData);
        const update = await docRef.update(valitedData);
        if (!update)
            throw new RequestError(500, "Não foi possível atualizar os dados.");

        return new RequestResponse(200);
    }

    async addMenuItemImage(menuId, imageB64) {
        if (!(imageB64 || menuId))
            throw new RequestError(400, "imageB64/menuId nulo");
        if (!this.user)
            throw protectedServiceUninitialized();
        if (!isValidBase64(imageB64))
            throw new RequestError(400, "A string da imagem não é um Base64 válido.");
    
        const userId = this.user.uid;
        const menuRef = imagedb.doc(menuId);
        const menuSnap = await menuRef.get();
    
        if (!menuSnap.exists)
            throw new RequestError(404, "O menuId especificado não está registrado no banco de imagens");
    
        if (menuSnap.get("owner") !== userId)
            throw new RequestError(403, "O usuário não é dono do menu");
    
        // Conta quantos menus o usuário tem
        const menuCountSnap = await imagedb.where("owner", "==", userId).count().get();
        const menuCount = menuCountSnap.data().count;
    
        // Busca os menus do usuário
        const userMenusSnap = await imagedb.where("owner", "==", userId).get();
    
        // Conta quantas imagens no total o usuário tem
        const countPromises = userMenusSnap.docs.map(doc =>
            imagedb.doc(doc.id).collection("imageCollection").count().get()
        );
    
        const imageCountSnaps = await Promise.all(countPromises);
        const userImageCount = imageCountSnaps.reduce(
            (sum, snap) => sum + snap.data().count, 0
        );
    
        if (menuCount * MAX_MENU_ITEMS < userImageCount + 1)
            throw new RequestError(422, "O usuário excedeu o limite do número de imagens por usuário.");
    
        // Cria nova imagem na subcoleção
        const newImageId = generateId();
    
        await menuRef.collection("imageCollection").doc(newImageId).set({
            imageB64: imageB64
        });
    
        return new RequestResponse(200, newImageId);
    }
    
    async deleteMenuItemImage(menuId, imageId) {
        if (!menuId || !imageId)
            throw new RequestError(400, "menuId nulo/imageId nulo");
        if (!this.user)
            throw protectedServiceUninitialized();

        const userId = this.user.uid;
        const menuRef = imagedb.doc(menuId);
        const menuSnap = await menuRef.get();

        if (!menuSnap.exists)
            throw new RequestError(404, "O menuId especificado não está registrado no banco de imagens");

        if (menuSnap.get("owner") !== userId)
            throw new RequestError(403, "O usuário não é dono do menu");

        const imageRef = menuRef.collection("imageCollection").doc(imageId);
        const imageSnap = await imageRef.get();

        if (!imageSnap.exists)
            throw new RequestError(404, "Imagem não encontrada.");

        await imageRef.delete();

        return new RequestResponse(200);
    }


    // Essa função tem um query mais pesado então decidi colocar dentro das funções protegidas
    async getMenuFromUid(userId) {
        if (!userId) throw new RequestError(400, "userId nulo");
        if (!this.user) throw protectedServiceUninitialized();

        const snapshot = await db.where("owner", "==", userId).get();

        if (snapshot.empty) return new RequestResponse(200, []);

        return new RequestResponse(
            200,
            snapshot.docs.map((doc) => ({
                id: doc.id,
                title: doc.data().title,
            }))
        );
    }
}

async function readMenuData(menuId) {
    if (!menuId) throw new RequestError(400, "menuId nulo");

    const docRef = db.doc(menuId);
    const doc = await docRef.get();

    if (!doc.exists)
        throw new RequestError(
            404,
            `Menu referente ao id "${menuId}" não existe.`
        );

    return new RequestResponse(200, { id: menuId, ...doc.data() });
}

async function matchMenuRoute(menuRoute) {
    if (!menuRoute) throw new RequestError(400, "menuRoute nulo");

    const snapshot = await db.where("route", "==", menuRoute).get();

    if (snapshot.empty) {
        // A resposta 404 aqui não joga erro.
        return new RequestResponse(404, "Rota não encontrada.");
    }

    return new RequestResponse(200, {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
    });
}

async function menuRouteExists(menuRoute) {
    if (!menuRoute) return false;

    const snapshot = await db.where("route", "==", menuRoute).get();

    if (snapshot.empty) return false;

    return true;
}

export {
    ProtectedService,
    readMenuData,
    matchMenuRoute,
    admin,
    RequestResponse,
    RequestError,
};
