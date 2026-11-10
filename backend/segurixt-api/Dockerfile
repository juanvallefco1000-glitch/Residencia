# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp -Pproduction-image -DskipTests dependency:go-offline
COPY src/main ./src/main
RUN mvn -B -ntp -Pproduction-image -DskipTests package \
    && cp target/segurixt-api-0.0.1-SNAPSHOT.jar /workspace/app.jar

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
RUN groupadd --gid 10001 segurixt \
    && useradd --uid 10001 --gid 10001 --home-dir /app --shell /usr/sbin/nologin segurixt \
    && mkdir -p /var/data/productos \
    && chown -R 10001:10001 /var/data
COPY --from=build --chown=root:root /workspace/app.jar /app/app.jar
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=10000 \
    PRODUCTS_IMAGES_DIRECTORY=/var/data/productos \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0 -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"
USER 10001:10001
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
