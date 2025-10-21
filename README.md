# menuire-backend

Esse pacote fornece as principais interações entre o banco de dados e o website do Menuire através de uma API Express.js.

## Funcionalidades

- Criação, leitura, atualização e exclusão (CRUD) de cardápios.
- Upload e exclusão de imagens para os itens do cardápio.
- Autenticação de usuário para proteger endpoints de escrita.
- Limitação de taxa de requisições (rate limiting) para endpoints de leitura e escrita.
- Validação de dados para garantir a integridade dos dados.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução para o servidor.
- **Express.js**: Framework para a construção da API.
- **Firebase Admin SDK**: Para interação com os serviços do Firebase.
  - **Firestore**: Banco de dados NoSQL para armazenar os dados dos cardápios.
  - **Firebase Authentication**: Para autenticação de usuários.
- **cors**: Middleware para habilitar o CORS (Cross-Origin Resource Sharing).
- **express-rate-limit**: Middleware para limitar a taxa de requisições.

## Endpoints da API

A seguir, a lista de endpoints disponíveis na API.

### Endpoints Públicos

- `GET /`: Retorna uma lista de todos os endpoints disponíveis na API.
- `GET /menu/:menuId`: Retorna os dados de um cardápio específico.
- `GET /match-route/:routeName`: Encontra e retorna um cardápio que corresponde a uma rota específica.

### Endpoints Protegidos

Estes endpoints exigem um token de autenticação do Firebase no cabeçalho `Authorization` da requisição (`Bearer <token>`).

- `GET /user-menus/:userId`: Retorna todos os cardápios de um usuário específico.
- `POST /menu`: Cria um novo cardápio.
- `PUT /menu/:menuId`: Atualiza os dados de um cardápio existente.
- `DELETE /menu/:menuId`: Deleta um cardápio.
- `POST /item-image/:menuId`: Adiciona uma imagem a um item de um cardápio.
- `DELETE /item-image/:menuId/:imageId`: Deleta uma imagem de um item de um cardápio.

## Configuração

A configuração da aplicação é feita através do arquivo `config.json`. Abaixo estão as variáveis de configuração disponíveis:

- `HTTP_PORT`: A porta em que o servidor irá rodar.
- `CORS_ORIGIN`: Uma lista de origens permitidas para o CORS.
- `MAX_READ_REQUESTS`: O número máximo de requisições de leitura permitidas por janela de tempo.
- `MAX_WRITE_REQUESTS`: O número máximo de requisições de escrita permitidas por janela de tempo.
- `RATE_LIMIT_WINDOW`: A janela de tempo para o rate limiting, em milissegundos.
- `MAX_URL_LENGTH`: O comprimento máximo permitido para a URL da requisição.
- `MAX_WRITE_SIZE`: O tamanho máximo do corpo da requisição para endpoints de escrita (ex: "10kb").
- `MAX_IMAGE_SIZE`: O tamanho máximo para o upload de imagens (ex: "100kb").
- `MAX_MENU_ITEMS`: O número máximo de itens permitidos em um cardápio.
- `MAX_MENU_SEPARATORS`: O número máximo de separadores permitidos em um cardápio.

## Como Executar

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/menuire-backend.git
   cd menuire-backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as credenciais do Firebase:**
   - Crie um arquivo chamado `firebaseCredentials.json` na raiz do projeto.
   - Preencha o arquivo com as suas credenciais de serviço do Firebase. Você pode obter essas credenciais no console do Firebase, nas configurações do seu projeto.

4. **Inicie o servidor:**
   ```bash
   npm start
   ```

O servidor estará rodando na porta especificada no arquivo `config.json`.
