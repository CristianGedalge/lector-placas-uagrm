FROM node:20-alpine

WORKDIR /app

# Copiar e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código del frontend
COPY . .

# Exponer el puerto por defecto de Vite
EXPOSE 5173

# Arrancar el servidor de desarrollo exponiendo el host para Docker
CMD ["npm", "run", "dev", "--", "--host"]
