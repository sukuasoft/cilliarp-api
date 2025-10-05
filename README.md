# API da Plataforma de Cursos Cilliarp

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

Uma API abrangente para plataforma de cursos construída com NestJS, apresentando autenticação JWT, autorização baseada em funções, armazenamento de arquivos com MinIO e operações CRUD completas para cursos, aulas, utilizadores e inscrições.

## 🚀 Funcionalidades

- **Autenticação JWT**: Autenticação segura baseada em tokens
- **Autorização por Função**: Funções de Administrador e Estudante com permissões adequadas
- **Armazenamento de Arquivos**: Integração MinIO para vídeos, imagens e documentos
- **Gestão de Cursos**: Operações CRUD completas para cursos e aulas
- **Gestão de Utilizadores**: Perfis de utilizador com upload de avatar
- **Sistema de Inscrições**: Inscrição de estudantes com acompanhamento de progresso
- **Integração de Base de Dados**: PostgreSQL com Prisma ORM
- **Validação de Entrada**: Validação abrangente de dados com class-validator
- **Tratamento de Erros**: Respostas de erro estruturadas
- **Suporte CORS**: Partilha de recursos entre origens habilitada

## 🛠️ Stack Tecnológica

- **Framework**: NestJS
- **Base de Dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: JWT com Passport
- **Armazenamento de Arquivos**: MinIO
- **Validação**: class-validator
- **Linguagem**: TypeScript

## 📋 Pré-requisitos

- Node.js (v16 ou superior)
- Base de dados PostgreSQL
- Servidor MinIO (para armazenamento de arquivos)

## ⚙️ Instalação

1. **Clonar o repositório**
   ```bash
   git clone <repository-url>
   cd cilliarp-api
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configuração do Ambiente**
   
   Criar um arquivo `.env` no diretório raiz:
   ```env
   # Base de Dados
   DATABASE_URL="postgresql://username:password@localhost:5432/cilliarp_db"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   
   # Configuração MinIO
   MINIO_ENDPOINT="localhost"
   MINIO_PORT="9000"
   MINIO_USE_SSL="false"
   MINIO_ACCESS_KEY="minioadmin"
   MINIO_SECRET_KEY="minioadmin"
   MINIO_BUCKET_NAME="cilliarp-files"
   
   # Aplicação
   PORT=3030
   NODE_ENV="development"
   ```

4. **Configuração da Base de Dados**
   ```bash
   # Gerar cliente Prisma
   npx prisma generate
   
   # Executar migrações da base de dados
   npx prisma migrate dev
   
   # (Opcional) Popular a base de dados
   npx prisma db seed
   ```

5. **Iniciar a aplicação**
   ```bash
   # Modo de desenvolvimento
   npm run start:dev
   
   # Modo de produção
   npm run start:prod
   ```

A API estará disponível em `http://localhost:3030`

## 📚 Documentação da API

### Endpoints de Autenticação

| Método | Endpoint | Descrição | Autenticação Necessária |
|--------|----------|-----------|-------------------------|
| POST | `/auth/register` | Registar novo utilizador | Não |
| POST | `/auth/login` | Login do utilizador | Não |
| GET | `/auth/profile` | Obter perfil do utilizador atual | Sim |

### Endpoints de Utilizadores

| Método | Endpoint | Descrição | Autenticação Necessária | Função |
|--------|----------|-----------|-------------------------|--------|
| GET | `/users` | Listar todos os utilizadores | Sim | Admin |
| GET | `/users/:id` | Obter utilizador por ID | Sim | Qualquer |
| PATCH | `/users/:id` | Atualizar utilizador | Sim | Proprietário/Admin |
| DELETE | `/users/:id` | Eliminar utilizador | Sim | Proprietário/Admin |
| POST | `/users/:id/avatar` | Upload de avatar | Sim | Proprietário/Admin |
| GET | `/users/:id/avatar` | Obter URL do avatar | Sim | Qualquer |

### Endpoints de Cursos

| Método | Endpoint | Descrição | Autenticação Necessária | Função |
|--------|----------|-----------|-------------------------|--------|
| GET | `/courses` | Listar cursos | Não | Qualquer |
| POST | `/courses` | Criar curso | Sim | Admin |
| GET | `/courses/:id` | Obter detalhes do curso | Não | Qualquer |
| PATCH | `/courses/:id` | Atualizar curso | Sim | Admin |
| DELETE | `/courses/:id` | Eliminar curso | Sim | Admin |
| POST | `/courses/:id/thumbnail` | Upload de miniatura | Sim | Admin |
| GET | `/courses/:id/thumbnail` | Obter URL da miniatura | Não | Qualquer |

### Endpoints de Aulas

| Método | Endpoint | Descrição | Autenticação Necessária | Função |
|--------|----------|-----------|-------------------------|--------|
| GET | `/lessons` | Listar aulas | Não | Qualquer |
| POST | `/lessons` | Criar aula | Sim | Admin |
| GET | `/lessons/:id` | Obter detalhes da aula | Não | Qualquer |
| PATCH | `/lessons/:id` | Atualizar aula | Sim | Admin |
| DELETE | `/lessons/:id` | Eliminar aula | Sim | Admin |
| POST | `/lessons/:id/video` | Upload de vídeo | Sim | Admin |
| GET | `/lessons/:id/video` | Obter URL do vídeo | Sim | Estudante Inscrito |
| PATCH | `/lessons/course/:courseId/reorder` | Reordenar aulas | Sim | Admin |

### Endpoints de Inscrições

| Método | Endpoint | Descrição | Autenticação Necessária | Função |
|--------|----------|-----------|-------------------------|--------|
| GET | `/enrollments` | Listar inscrições | Sim | Qualquer |
| POST | `/enrollments` | Criar inscrição | Sim | Estudante |
| GET | `/enrollments/:id` | Obter detalhes da inscrição | Sim | Proprietário/Admin |
| PATCH | `/enrollments/:id` | Atualizar progresso | Sim | Proprietário/Admin |
| DELETE | `/enrollments/:id` | Cancelar inscrição | Sim | Proprietário/Admin |
| GET | `/enrollments/stats` | Obter estatísticas de inscrições | Sim | Admin |
| GET | `/enrollments/student/:studentId/courses` | Obter cursos do estudante | Sim | Proprietário/Admin |
| GET | `/enrollments/course/:courseId/students` | Obter estudantes do curso | Sim | Admin |

## 🔐 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Incluir o token no cabeçalho Authorization:

```
Authorization: Bearer <your-jwt-token>
```

### Funções de Utilizador

- **Admin**: Acesso completo a todos os recursos
- **Estudante**: Acesso limitado baseado na propriedade e inscrição

## 📁 Upload de Arquivos

A plataforma suporta upload de arquivos para:

- **Avatares de Utilizador**: Imagens (JPEG, PNG, GIF) até 5MB
- **Miniaturas de Curso**: Imagens (JPEG, PNG, GIF) até 5MB
- **Vídeos de Aula**: Arquivos de vídeo (MP4, AVI, MOV, etc.) até 500MB

Os arquivos são armazenados no MinIO e acedidos através de URLs pré-assinados para segurança.

## 🗃️ Esquema da Base de Dados

### Entidades Principais

- **Utilizador**: Contas de utilizador com funções e informações de perfil
- **Curso**: Informações do curso com preços e estado de publicação
- **Aula**: Aulas individuais dentro dos cursos com conteúdo de vídeo
- **Inscrição**: Inscrição de estudantes em cursos com acompanhamento de progresso
- **Avaliação**: Avaliações e classificações de cursos
- **Pagamento**: Acompanhamento de pagamentos para inscrições

## 🚦 Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📦 Estrutura do Projeto

```
src/
├── auth/           # Módulo de autenticação
├── users/          # Gestão de utilizadores
├── courses/        # Gestão de cursos
├── lessons/        # Gestão de aulas
├── enrollments/    # Gestão de inscrições
├── minio/          # Serviço de armazenamento de arquivos
├── prisma/         # Serviço de base de dados
├── app.module.ts   # Módulo principal da aplicação
└── main.ts         # Ponto de entrada da aplicação
```

## 🐳 Suporte Docker

Construir e executar com Docker:

```bash
# Construir a imagem
docker build -t cilliarp-api .

# Executar com docker-compose
docker-compose up -d
```

## 🔧 Configuração

Toda a configuração é gerida através de variáveis de ambiente. Consultar `.env.example` para todas as opções disponíveis.

## 📈 Monitorização e Logs

A aplicação inclui:
- Logs de pedidos/respostas
- Acompanhamento de erros
- Monitorização de performance
- Endpoints de verificação de saúde

## 🤝 Contribuição

1. Fazer fork do repositório
2. Criar uma branch de funcionalidade
3. Fazer as alterações
4. Adicionar testes
5. Submeter um pull request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - consultar o arquivo LICENSE para detalhes.

## 👥 Suporte

Para suporte e questões, por favor abrir uma issue no repositório.