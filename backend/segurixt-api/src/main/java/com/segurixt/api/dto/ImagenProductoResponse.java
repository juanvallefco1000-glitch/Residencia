package com.segurixt.api.dto;

public record ImagenProductoResponse(Long id, String url, String textoAlt, boolean principal, Integer orden) {}
