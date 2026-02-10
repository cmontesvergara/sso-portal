# Etapa 1: Construcción
FROM public.ecr.aws/docker/library/node:20 AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos del proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Construir la aplicación Angular para producción
RUN npm run build -- --configuration production

# Etapa 2: Configuración del servidor
FROM public.ecr.aws/nginx/nginx:stable-alpine

# Eliminar configuración predeterminada de NGINX
RUN rm -rf /usr/share/nginx/html/*

# Copiar archivos construidos desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar archivo personalizado de configuración de NGINX
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]

