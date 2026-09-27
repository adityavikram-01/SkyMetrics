FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S skymetrics && adduser -S skymetrics -G skymetrics
COPY --from=build /workspace/target/skymetrics-backend-*.jar /app/skymetrics-backend.jar
USER skymetrics
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/skymetrics-backend.jar"]
