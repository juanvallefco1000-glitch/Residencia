package com.segurixt.api.users;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
@EnabledIfEnvironmentVariable(named="USERS_TEST_MYSQL_URL",matches="jdbc:mysql:.*")
@SpringBootTest(properties={"spring.datasource.url=${USERS_TEST_MYSQL_URL}","spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
 "spring.datasource.username=${USERS_TEST_MYSQL_USERNAME}","spring.datasource.password=${USERS_TEST_MYSQL_PASSWORD}",
 "spring.jpa.hibernate.ddl-auto=none","auth.jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
class UsuarioConcurrencyMySqlIT extends UserConcurrencyScenario {}
