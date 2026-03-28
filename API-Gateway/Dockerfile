FROM nginx:1.25-alpine

# Copy main nginx.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy routes folder
COPY nginx/routes /etc/nginx/routes

# Copy includes folder
COPY nginx/includes /etc/nginx/includes

EXPOSE 8080