package com.segurixt.api.quotes;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import static com.segurixt.api.quotes.QuoteModels.*;

@RestController
@RequestMapping("/api/cotizador")
public class QuoteController {
    private final QuoteService service;
    public QuoteController(QuoteService service) { this.service=service; }
    @GetMapping("/productos") public Map<String,Object> products(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="0") int page) {
        if (q.length()>200 || page<0 || page>100000) throw new IllegalArgumentException("Filtro inválido");
        var products=service.products().stream().filter(p -> p.name().toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT))).toList();
        return Map.of("content",products.stream().skip(page*50L).limit(50).toList(),"total",products.size());
    }
    @GetMapping("/instalacion") public Map<String,Object> policy() {
        var t=service.installationTariffs();
        return Map.of("includedLength",t.includedLength(),"cableMode",t.cableMode(),"segmentLength",t.segmentLength()==null?"":t.segmentLength(),"maxAutoHeight",t.maxAutoHeight()==null?"":t.maxAutoHeight());
    }
    @PostMapping("/estimar") public Estimate estimate(@Valid @RequestBody Request request) { return service.estimate(request); }
    @PostMapping("/solicitudes") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public Map<String,Object> submit(@Valid @RequestBody Formal request) { return service.submit(request); }
}
