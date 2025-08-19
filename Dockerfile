# Usar Node.js 18
FROM node:18-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Puerto que usa Cloud Run
EXPOSE 8080

# Comando de inicio
CMD ["npm", "start"]