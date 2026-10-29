package com.segurixt.api.service;

import com.segurixt.api.dto.*;
import com.segurixt.api.entity.*;
import com.segurixt.api.repository.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductoImagenService {
    public static final int MAX_BYTES=3*1024*1024;
    private static final String PREFIX="/api/productos/imagenes/";
    private final ProductoRepository productos;
    private final ImagenProductoRepository imagenes;
    private final Path directory;
    public ProductoImagenService(ProductoRepository productos, ImagenProductoRepository imagenes,
            @Value("${products.images.directory:./uploads/productos}") String directory) {
        this.productos=productos; this.imagenes=imagenes; this.directory=Path.of(directory).toAbsolutePath().normalize();
    }

    @Transactional
    public ImagenProductoResponse agregar(long productoId, ImagenProductoRequest request) {
        var p=productos.findLockedById(productoId).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Producto no encontrado."));
        var existing=imagenes.findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(List.of(productoId));
        if(existing.size()>=10) throw error(HttpStatus.CONFLICT,"Máximo 10 imágenes por producto.");
        var decoded=validar(request);
        String filename=UUID.randomUUID()+"."+decoded.extension();
        Path target=directory.resolve(filename);
        try {
            Files.createDirectories(directory);
            try(var output=Files.newOutputStream(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                // Registrar al crear el archivo permite retirar también una escritura parcial.
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        if(status!=STATUS_COMMITTED) {
                            try { Files.deleteIfExists(target); } catch(IOException ignored) { /* Sin registrar datos del archivo. */ }
                        }
                    }
                });
                output.write(decoded.bytes());
            }
        } catch(IOException e) { throw error(HttpStatus.SERVICE_UNAVAILABLE,"No se pudo guardar la imagen."); }
        boolean principal=request.principal() || existing.isEmpty();
        if(principal) existing.forEach(i->i.setPrincipal(false));
        var image=new ImagenProducto(); image.setProducto(p); image.setUrl(PREFIX+filename);
        image.setTextoAlt(request.textoAlt()==null?null:request.textoAlt().trim());
        image.setPrincipal(principal);
        image.setOrden(existing.stream().mapToInt(ImagenProducto::getOrden).max().orElse(-1)+1);
        imagenes.saveAndFlush(image);
        return new ImagenProductoResponse(image.getId(),image.getUrl(),image.getTextoAlt(),principal,image.getOrden());
    }

    @Transactional
    public void quitar(long productoId,long imageId) {
        productos.findLockedById(productoId).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Producto no encontrado."));
        var image=imagenes.findById(imageId).filter(i->i.getProducto().getId().equals(productoId))
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"Imagen no encontrada."));
        boolean principal=Boolean.TRUE.equals(image.getPrincipal());
        imagenes.delete(image); imagenes.flush();
        if(principal) imagenes.findByProductoIdInOrderByPrincipalDescOrdenAscIdAsc(List.of(productoId))
            .stream().findFirst().ifPresent(i->i.setPrincipal(true));
        // Se retira la referencia. El archivo se conserva para no borrar activos de almacenamiento.
    }

    @Transactional(readOnly=true)
    public Archivo leer(String filename) {
        if(!filename.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(png|jpg)"))
            throw error(HttpStatus.NOT_FOUND,"Imagen no encontrada.");
        var image=imagenes.findByUrl(PREFIX+filename).filter(i->Boolean.TRUE.equals(i.getProducto().getActivo())
            && Boolean.TRUE.equals(i.getProducto().getCategoria().getActivo()))
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"Imagen no encontrada."));
        try {
            return new Archivo(Files.readAllBytes(directory.resolve(filename)),filename.endsWith(".png")?"image/png":"image/jpeg");
        } catch(IOException e) { throw error(HttpStatus.NOT_FOUND,"Imagen no encontrada."); }
    }
    public record Archivo(byte[] bytes,String tipo) {}
    private record Decoded(byte[] bytes,String extension) {}

    private Decoded validar(ImagenProductoRequest r) {
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(r.contenidoBase64()); }
        catch(IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST,"Contenido de imagen inválido."); }
        if(bytes.length==0 || bytes.length>MAX_BYTES) throw error(HttpStatus.PAYLOAD_TOO_LARGE,"La imagen debe ocupar como máximo 3 MiB.");
        String name=r.nombreArchivo().toLowerCase(Locale.ROOT);
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(input);
            if(!readers.hasNext()) throw error(HttpStatus.BAD_REQUEST,"Solo se permiten imágenes JPEG o PNG válidas.");
            var reader=readers.next();
            try {
                String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                if(!(format.equals("png") && name.endsWith(".png"))
                    && !(format.equals("jpeg") && (name.endsWith(".jpg") || name.endsWith(".jpeg"))))
                    throw error(HttpStatus.BAD_REQUEST,"El formato y la extensión deben ser JPEG o PNG y coincidir.");
                reader.setInput(input,true,true);
                int width=reader.getWidth(0), height=reader.getHeight(0);
                if(width<1 || height<1 || width>6000 || height>6000 || (long)width*height>16000000)
                    throw error(HttpStatus.BAD_REQUEST,"Dimensiones máximas: 6000 por lado y 16 megapíxeles.");
                var image=reader.read(0);
                var output=new ByteArrayOutputStream();
                String extension=format.equals("png")?"png":"jpg";
                if(image==null || !ImageIO.write(image,extension,output)) throw new IOException();
                byte[] clean=output.toByteArray();
                if(clean.length>MAX_BYTES) throw error(HttpStatus.PAYLOAD_TOO_LARGE,"La imagen procesada supera 3 MiB.");
                return new Decoded(clean,extension);
            } finally { reader.dispose(); }
        } catch(IOException e) { throw error(HttpStatus.BAD_REQUEST,"No se pudo leer la imagen."); }
    }
    private static ResponseStatusException error(HttpStatus status,String reason) { return new ResponseStatusException(status,reason); }
}
