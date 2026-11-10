package com.segurixt.api.config;

import java.net.URI;
import java.util.*;

public final class CorsOrigins {
    private CorsOrigins() {}
    public static List<String> parse(String value,boolean production) {
        if(value==null || value.isBlank()) throw new IllegalArgumentException("Configura AUTH_CORS_ORIGINS con orígenes exactos.");
        var result=new LinkedHashSet<String>();
        for(String part:value.split(",",-1)) {
            String origin=part.trim();
            URI uri;
            try { uri=URI.create(origin); } catch(IllegalArgumentException e) { throw invalid(); }
            if(uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
                    || (uri.getPath()!=null && !uri.getPath().isEmpty()) || origin.contains("*")
                    || !(production?"https".equals(uri.getScheme()):List.of("http","https").contains(uri.getScheme()))
                    || (production && loopback(uri.getHost()))) throw invalid();
            result.add(origin);
        }
        return List.copyOf(result);
    }
    static boolean loopback(String host) {
        host=host.toLowerCase(Locale.ROOT).replaceFirst("\\.$", "");
        return host.equalsIgnoreCase("localhost") || host.toLowerCase(Locale.ROOT).endsWith(".localhost")
            || host.startsWith("127.") || host.equals("0.0.0.0") || host.equals("[::1]") || host.equals("::1");
    }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("AUTH_CORS_ORIGINS admite solo orígenes exactos; prod requiere HTTPS sin localhost, rutas o comodines."); }
}
