package com.segurixt.api.controller;

import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes = ProductoController.class)
public class ProductoErrorHandler {
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, String>> parametrosInvalidos(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("mensaje", "Parámetros inválidos. page >= 0; size entre 1 y 48; q hasta 200 caracteres; categoria es un slug de hasta 120."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> noEncontrado(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("mensaje", "Producto no encontrado."));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<Map<String, String>> datosNoDisponibles(DataAccessException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("mensaje", "El catálogo no está disponible temporalmente."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> errorInesperado(Exception exception) {
        return ResponseEntity.internalServerError().body(Map.of("mensaje", "No se pudo consultar el catálogo."));
    }
}
