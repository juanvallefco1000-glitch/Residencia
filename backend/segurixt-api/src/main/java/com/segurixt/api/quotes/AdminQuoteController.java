package com.segurixt.api.quotes;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import static com.segurixt.api.quotes.QuoteModels.*;

@RestController
@RequestMapping("/api/admin/cotizaciones")
public class AdminQuoteController {
    private final QuoteService service;
    public AdminQuoteController(QuoteService service) { this.service=service; }
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") int page) { return service.list(page); }
    @GetMapping("/instalacion") public InstallationTariffs installation() { return service.installationTariffs(); }
    @PutMapping("/instalacion") public InstallationTariffs installation(@Valid @RequestBody InstallationTariffs t) { return service.saveInstallationTariffs(t); }
    @GetMapping("/configuracion") public Settings settings() { return service.settings(); }
    @PutMapping("/configuracion") public Settings settings(@Valid @RequestBody Settings s) { return service.saveSettings(s); }
    @GetMapping("/perfiles/{id}") public Profile profile(@PathVariable long id) { return service.profile(id); }
    @PutMapping("/perfiles") public Profile profile(@Valid @RequestBody Profile p) { return service.saveProfile(p); }
    @GetMapping("/{id}") public Map<String,Object> detail(@PathVariable String id) { return service.detail(id); }
}
