package com.segurixt.api.quotes;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.segurixt.api.quotes.QuoteModels.*;

@Service
public class QuoteService {
    private final QuoteRepository repository;
    private final InstallationTariffRepository installationTariffs;
    private final QuoteEngine engine = new QuoteEngine();
    public QuoteService(QuoteRepository repository, InstallationTariffRepository tariffs) { this.repository=repository; this.installationTariffs=tariffs; }
    @Transactional(readOnly=true)
    public List<Product> products() { return repository.products(); }
    @Transactional(readOnly=true)
    public Settings settings() { return repository.settings(); }
    @Transactional
    public Settings saveSettings(Settings s) {
        if (Boolean.TRUE.equals(s.taxEnabled()) && s.taxRate()==null) throw new IllegalArgumentException("Indica la tasa fiscal");
        if (s.highDifficultyMultiplier()!=null && s.highDifficultyMultiplier().compareTo(java.math.BigDecimal.ONE)<0
            || s.exteriorMultiplier()!=null && s.exteriorMultiplier().compareTo(java.math.BigDecimal.ONE)<0) throw new IllegalArgumentException("Factor mínimo 1");
        return repository.saveSettings(s);
    }
    @Transactional(readOnly=true)
    public Profile profile(long id) {
        if (id<1 || !repository.existsProduct(id)) throw new IllegalArgumentException("Producto inexistente");
        return repository.profile(id);
    }
    @Transactional
    public Profile saveProfile(Profile p) {
        if (!repository.existsProduct(p.productId())) throw new IllegalArgumentException("Producto inexistente");
        if (!List.of("OTHER","KIT","ACCESSORY").contains(p.role()) && (p.family()==null || p.family().isBlank())) throw new IllegalArgumentException("Familia requerida");
        if ("RECORDER".equals(p.role()) && p.channels()<1) throw new IllegalArgumentException("Canales requeridos");
        return repository.saveProfile(p);
    }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public Estimate estimate(Request request) {
        return engine.calculate(request,repository.products(),repository.settings(),request.installation().perCamera()?installationTariffs.read():null);
    }
    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> submit(Formal formal) {
        var settings=repository.settings();
        var tariffs=formal.configuration().installation().perCamera()?installationTariffs.read():null;
        var estimate=engine.calculate(formal.configuration(),repository.products(),settings,tariffs);
        var result=repository.save(formal,estimate,settings);
        if (tariffs!=null) installationTariffs.snapshot((String)result.get("id"),formal.configuration().installation(),tariffs,estimate);
        return result;
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> list(int page) {
        if (page<0 || page>100000) throw new IllegalArgumentException("Página inválida");
        return repository.list(page);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(String id) { return repository.detail(id); }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public InstallationTariffs installationTariffs() { return installationTariffs.read(); }
    @Transactional
    public InstallationTariffs saveInstallationTariffs(InstallationTariffs t) {
        var ranges=new ArrayList<>(t.heightRates()); ranges.sort(Comparator.comparing(HeightRate::minHeight));
        for(int i=0;i<ranges.size();i++) {
            if (ranges.get(i).minHeight().compareTo(ranges.get(i).maxHeight())>=0 || i>0 && ranges.get(i-1).maxHeight().compareTo(ranges.get(i).minHeight())>0) throw new IllegalArgumentException("Rangos de altura inválidos o superpuestos");
        }
        if(t.cableRules().stream().map(CableRule::family).distinct().count()!=t.cableRules().size() || t.materials().stream().map(MaterialRate::name).distinct().count()!=t.materials().size()) throw new IllegalArgumentException("Familias o materiales duplicados");
        return installationTariffs.save(t);
    }
}
