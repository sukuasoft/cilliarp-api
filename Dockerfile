# Use Node.js oficial image
FROM node:18-alpine

# Defina o diretório de trabalho
WORKDIR /app

# Copie package.json e yarn.lock (se existir)
COPY package*.json ./
COPY yarn.lock* ./

# Instale as dependências
RUN yarn install

# Copie o código fonte
COPY . .

# Build da aplicação
RUN yarn build

# Exponha a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["yarn", "start:prod"]
