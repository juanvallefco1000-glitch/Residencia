package com.segurixt.api.service;

import com.segurixt.api.entity.CategoriaServicio;
import com.segurixt.api.repository.CategoriaServicioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class CategoriaServicioService {

    private final CategoriaServicioRepository repository;

    public CategoriaServicioService(
            CategoriaServicioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CategoriaServicio> listarActivas() {
        return repository.findByActivoTrueOrderByOrdenAsc();
    }
}