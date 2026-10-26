FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY apix-frontend/package.json apix-frontend/package-lock.json ./
RUN npm ci
COPY apix-frontend/index.html ./
COPY apix-frontend/public ./public
COPY apix-frontend/src ./src
COPY apix-frontend/vite.config.js ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-21-alpine AS backend
WORKDIR /backend
COPY apix-backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY apix-backend/src ./src
COPY --from=frontend /frontend/dist ./src/main/resources/static
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S skymetrics && adduser -S skymetrics -G skymetrics
COPY --from=backend /backend/target/skymetrics-backend-*.jar /app/skymetrics.jar
USER skymetrics
ENV SERVER_ADDRESS=0.0.0.0
ENV JAVA_TOOL_OPTIONS="-Xmx300m -XX:MaxMetaspaceSize=128m"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/skymetrics.jar"]
