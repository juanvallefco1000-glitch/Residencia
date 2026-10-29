package com.segurixt.api.controller;
import com.segurixt.api.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AuthService auth;
 public AuthController(AuthService auth) { this.auth=auth; }
 public record Credentials(@NotBlank @Email @Size(max=150) String email, @NotBlank @Size(max=72) String password) {}
 @PostMapping("/login") public ResponseEntity<AuthService.Session> login(@Valid @RequestBody Credentials body) {
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(auth.login(body.email(),body.password()));
 }
 @GetMapping("/me") public ResponseEntity<AuthService.User> me(@AuthenticationPrincipal AuthService.User user) {
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(user);
 }
 @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void logout(@RequestHeader("Authorization") String header) { auth.logout(header.substring(7)); }
}
