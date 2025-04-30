
class RequestResponse {
    constructor(code, data = "Successful") {
        if (typeof code !== "number") {
            throw new Error("Construtor code inválido");
        }
        this.code = code;
        this.data = data;
    }
}

class RequestError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = this.constructor.name;
        this.stack = new Error().stack;
    }
}

function isObjectEmpty(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 0;
}

function dataValidator(data, sampleData) {
    let valitedObject = {};

    Object.entries(data).forEach(([key, value]) => {
        const sampleValue = sampleData[key];
        if (sampleValue === undefined) return;

        if (value === null || value === undefined || value === "")
            throw new RequestError(400, `Valor da chave "${key}" está vazio, nulo ou indefinido`);

        if (Array.isArray(value)) {
            if (!Array.isArray(sampleValue))
                throw new RequestError(400, `${key} deveria ser um array`);

            valitedObject[key] = value.map((item) => {
                if (typeof item !== "object" || item === null) {
                    throw new RequestError(
                        400,
                        `Elementos de ${key} devem ser objetos`
                    );
                }
                return dataValidator(item, sampleValue[0]); // Pega o primeiro item do sample como referência
            });
            return;
        }

        if (typeof value !== typeof sampleValue)
            throw new RequestError(
                400,
                `Tipo de dado de ${key} não corresponde ao esperado`
            );

        valitedObject[key] = value;
    });

    return valitedObject;
}

function isValidBase64(str) {
    if (!str || typeof str !== "string") return false;

    str = str.trim().replace(/\s+/g, '');

    if (str.length % 4 !== 0) return false;

    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;

    if (!base64Regex.test(str)) return false;

    try {
        atob(str);
        return true;
    } catch (e) {
        return false;
    }
}

function generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
  }

export { dataValidator, isValidBase64, generateId, isObjectEmpty, RequestError, RequestResponse};
