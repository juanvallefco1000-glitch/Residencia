package com.segurixt.api.controller;

import java.util.Map;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes={AdminProductoController.class,ProductoImagenController.class,UsuarioController.class})
public class AdminProductoErrorHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,String>> estado(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje",e.getReason()==null?"Solicitud inválida.":e.getReason()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class,IllegalArgumentException.class})
    ResponseEntity<Map<String,String>> invalido(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("mensaje","Datos inválidos. Revisa los campos, sus longitudes y los formatos permitidos."));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String,String>> conflicto(Exception e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje","El registro entra en conflicto con los datos existentes."));
    }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<Map<String,String>> base(Exception e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("mensaje","La base de datos no está disponible temporalmente."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String,String>> inesperado(Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("mensaje","No se pudo completar la operación administrativa."));
    }
}
