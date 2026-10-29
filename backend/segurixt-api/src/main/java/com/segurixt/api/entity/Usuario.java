package com.segurixt.api.entity;
import jakarta.persistence.*;
@Entity @Table(name="usuarios")
public class Usuario {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false, length=100) public String nombre;
 @Column(nullable=false, unique=true, length=150) public String email;
 @com.fasterxml.jackson.annotation.JsonIgnore
 @Column(name="password_hash", nullable=false) public String passwordHash;
 @Enumerated(EnumType.STRING) @Column(nullable=false) public Rol rol;
 @Column(nullable=false) public boolean activo;
 @Column(name="version_seguridad", nullable=false) public long versionSeguridad;
 public enum Rol { ADMIN, EDITOR, LECTOR }
}
