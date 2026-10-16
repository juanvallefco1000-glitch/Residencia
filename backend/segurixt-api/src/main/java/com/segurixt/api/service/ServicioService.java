package com.segurixt.api.service;

import com.segurixt.api.dto.ServicioResponse;
import com.segurixt.api.repository.ServicioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioService {

    private final ServicioRepository repository;

    public ServicioService(ServicioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ServicioResponse> listarActivos() {
        return repository.findByActivoTrueOrderByOrdenAsc()
            .stream()
            .map(servicio -> new ServicioResponse(
                servicio.getId(),
                servicio.getNombre(),
                servicio.getSlug(),
                servicio.getDescripcionCorta(),
                servicio.getDescripcion(),
                servicio.getImagenUrl(),
                servicio.getCategoria().getId(),
                servicio.getCategoria().getNombre()
            ))
            .toList();
    }
}