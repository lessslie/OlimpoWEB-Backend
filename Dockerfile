FROM node:20-alpine AS development

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar archivos de configuración primero
COPY package*.json tsconfig*.json nest-cli.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS production

# Argumentos para configurar el entorno
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar archivos de configuración y dependencias
COPY package*.json tsconfig*.json nest-cli.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar el código compilado desde la etapa de desarrollo
COPY --from=development /usr/src/app/dist ./dist

# Exponer el puerto que usará la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]
