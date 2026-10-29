package com.segurixt.api.auth;
import com.segurixt.api.controller.AuthController;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.*;
import org.springframework.dao.DataAccessException;
import java.util.Map;
@RestControllerAdvice(assignableTypes=AuthController.class)
public class AuthErrorHandler {
 @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> unauthorized(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("mensaje","Credenciales incorrectas o sesión no válida.")); }
 @ExceptionHandler({MethodArgumentNotValidException.class, org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(Map.of("mensaje","Revisa el correo y la contraseña (máximo 72 caracteres).")); }
 @ExceptionHandler(Exception.class) ResponseEntity<?> failure(Exception e) { return ResponseEntity.status(503).body(Map.of("mensaje","La autenticación no está disponible temporalmente.")); }
}
