package com.segurixt.api.products;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

/** Mismos escenarios contra MySQL real: rollback, sin DDL, seeds ni eliminaciones físicas. */
@EnabledIfEnvironmentVariable(named="PRODUCTS_TEST_MYSQL_URL", matches="jdbc:mysql:.*")
@SpringBootTest(properties={"spring.datasource.url=${PRODUCTS_TEST_MYSQL_URL}",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver", "spring.datasource.username=${PRODUCTS_TEST_MYSQL_USERNAME}",
    "spring.datasource.password=${PRODUCTS_TEST_MYSQL_PASSWORD}", "spring.jpa.hibernate.ddl-auto=none",
    "auth.jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@AutoConfigureMockMvc(print=org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
class AdminProductoMySqlTest extends ProductModuleScenario {}
