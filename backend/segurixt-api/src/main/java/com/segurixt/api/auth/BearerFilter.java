package com.segurixt.api.auth;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
public class BearerFilter extends OncePerRequestFilter {
 private final AuthService auth;
 private record Attempts(long until, int count) {}
 private final java.util.Map<String,Attempts> attempts=new java.util.HashMap<>();
 private synchronized boolean allowLogin(String address) {
  long now=System.currentTimeMillis();
  attempts.entrySet().removeIf(e -> e.getValue().until()<=now);
  var previous=attempts.get(address);
  if(previous==null && attempts.size()>=10000) return false;
  if(previous!=null && previous.count()>=20) return false;
  attempts.put(address,previous==null?new Attempts(now+60000,1):new Attempts(previous.until(),previous.count()+1));
  return true;
 }
 public BearerFilter(AuthService auth) { this.auth=auth; }
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
  if(req.getServletPath().startsWith("/api/auth/") || req.getServletPath().startsWith("/api/admin/")) res.setHeader("Cache-Control","no-store");
  if(req.getMethod().equals("POST") && req.getServletPath().equals("/api/auth/login") && !allowLogin(req.getRemoteAddr())) {
   res.setStatus(429); res.setHeader("Retry-After","60"); res.setContentType("application/json;charset=UTF-8");
   res.getWriter().write("{\"mensaje\":\"Demasiados intentos. Espera un minuto.\"}"); return;
  }
  String header=req.getHeader("Authorization");
  if(header!=null) {
   try {
    if(!header.startsWith("Bearer ")) throw AuthService.unauthorized();
    var user=auth.authenticate(header.substring(7));
    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,null,List.of(new SimpleGrantedAuthority("ROLE_"+user.rol()))));
   } catch(ResponseStatusException e) { error(res,401); return; }
   catch(org.springframework.dao.DataAccessException e) {
    res.setStatus(503); res.setContentType("application/json;charset=UTF-8");
    res.getWriter().write("{\"mensaje\":\"La autenticación no está disponible temporalmente.\"}"); return;
   }
  }
  chain.doFilter(req,res);
 }
 public static void error(HttpServletResponse res,int status) throws IOException {
  res.setStatus(status); res.setContentType("application/json;charset=UTF-8");
  res.getWriter().write("{\"mensaje\":\""+(status==401?"Inicia sesión de nuevo.":"No tienes permisos para esta operación.")+"\"}");
 }
}
