package com.segurixt.api.quotes;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public final class QuoteModels {
    private QuoteModels() {}
    public record Item(@NotNull @Positive Long productId, @Min(1) @Max(1000) int quantity) {}
    public record Installation(@NotNull @Digits(integer=7,fraction=2) @DecimalMin("0.01") @DecimalMax("1000000") BigDecimal areaM2,
        @Min(1) @Max(256) int cameras, @Pattern(regexp="INTERIOR|EXTERIOR|MIXTO") @NotNull String environment,
        @Pattern(regexp="NORMAL|ALTA") String difficulty,
        @Digits(integer=6,fraction=2) @DecimalMin("0.01") @DecimalMax("100000") BigDecimal cableMetres,
        @Digits(integer=3,fraction=2) @DecimalMin("0.01") @DecimalMax("500") BigDecimal heightMetres,
        @Size(max=256) List<@NotNull @Valid CameraRun> cameraRuns,
        @Pattern(regexp="UNKNOWN|SQUARE_CENTER|SQUARE_CORNER") String layoutAssumption) {
        public Installation(BigDecimal areaM2, int cameras, String environment, String difficulty, BigDecimal cableMetres) {
            this(areaM2,cameras,environment,difficulty,cableMetres,null,null,null);
        }
        public boolean perCamera() { return heightMetres!=null || cameraRuns!=null; }
        @AssertTrue(message="Indica altura y un recorrido por cámara; las distancias desconocidas pueden quedar vacías")
        public boolean isPerCameraValid() { return perCamera() ? heightMetres!=null && cameraRuns!=null && cameraRuns.size()==cameras : difficulty!=null; }
    }
    public record CameraRun(@Digits(integer=6,fraction=2) @DecimalMin("0.01") @DecimalMax("100000") BigDecimal distanceMetres) {}
    public record Request(@NotEmpty @Size(max=100) List<@Valid Item> items, @NotNull @Valid Installation installation) {}
    public record Formal(@NotNull @Valid Request configuration, @NotBlank @Size(max=150) String name,
        @NotBlank @Size(max=30) @Pattern(regexp="[+0-9 ()-]{7,30}") String phone,
        @Email @Size(max=150) String email, @Size(max=4000) String message) {}
    // Una familia verificada significa compatibilidad completa, no solo el protocolo de vídeo.
    public record Profile(@NotNull @Positive Long productId,
        @NotNull @Pattern(regexp="CAMERA|RECORDER|DISK|CABLE|CONNECTOR|ACCESSORY|KIT|OTHER") String role,
        @Size(max=80) String family, @Min(0) @Max(256) int channels) {}
    public record Product(long id, String name, BigDecimal price, String role, String family, int channels) {}
    public record Settings(@DecimalMin("0") @DecimalMax("1000000") @Digits(integer=7,fraction=2) BigDecimal labourPerCamera,
        @DecimalMin("0") @DecimalMax("100") @Digits(integer=3,fraction=4) BigDecimal highDifficultyMultiplier,
        @DecimalMin("0") @DecimalMax("100") @Digits(integer=3,fraction=4) BigDecimal exteriorMultiplier,
        @NotNull Boolean taxEnabled, @DecimalMin("0") @DecimalMax("1") @Digits(integer=1,fraction=6) BigDecimal taxRate) {}
    public record Line(Long productId, String description, BigDecimal quantity, String unit,
        BigDecimal unitPrice, BigDecimal amount, String pending, String kind) {
        public Line(Long id,String description,BigDecimal quantity,String unit,BigDecimal price,BigDecimal amount,String pending) {
            this(id,description,quantity,unit,price,amount,pending,id==null?"OTHER":"EQUIPMENT");
        }
    }
    public record Estimate(List<Line> lines, List<String> warnings, BigDecimal knownSubtotal,
        BigDecimal tax, BigDecimal knownTotal, boolean complete, boolean taxEnabled, BigDecimal taxRate,
        List<CableRunEstimate> cableRuns, BigDecimal heightMetres, BigDecimal includedLength) {
        public Estimate(List<Line> lines,List<String> warnings,BigDecimal subtotal,BigDecimal tax,BigDecimal total,boolean complete,boolean taxEnabled,BigDecimal taxRate) {
            this(lines,warnings,subtotal,tax,total,complete,taxEnabled,taxRate,List.of(),null,null);
        }
    }
    public record CableRunEstimate(int camera, BigDecimal distanceMetres, BigDecimal includedMetres,
        BigDecimal additionalMetres, BigDecimal billedMetres, Integer additionalSegments,
        BigDecimal amount, String pending) {}
    public record HeightRate(@NotNull @DecimalMin("0") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal minHeight,
        @NotNull @DecimalMin("0.01") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal maxHeight,
        @DecimalMin("0") @DecimalMax("1000000") @Digits(integer=7,fraction=2) BigDecimal pricePerCamera) {}
    public record CableRule(@NotBlank @Size(max=80) String family, boolean verified,
        @NotBlank @Size(max=150) String cameraType, @NotBlank @Size(max=150) String cableType,
        @NotBlank @Size(max=150) String connectors, @NotBlank @Size(max=150) String power,
        @NotBlank @Size(max=500) String manufacturerReference,
        @NotNull @DecimalMin("0.01") @DecimalMax("100000") @Digits(integer=6,fraction=2) BigDecimal maxRunMetres,
        boolean allowExtensions, boolean allowSegments, @Min(1) @Max(1000) int maxSegments) {}
    public record MaterialRate(@NotBlank @Size(max=150) String name,
        @NotNull @DecimalMin("0.01") @DecimalMax("1000") @Digits(integer=4,fraction=2) BigDecimal quantityPerCamera,
        @DecimalMin("0") @DecimalMax("1000000") @Digits(integer=7,fraction=2) BigDecimal unitPrice) {}
    public record InstallationTariffs(
        @NotNull @DecimalMin("0.01") @DecimalMax("100000") @Digits(integer=6,fraction=2) BigDecimal includedLength,
        @NotNull @Pattern(regexp="PENDING|METRE|SEGMENT") String cableMode,
        @DecimalMin("0") @DecimalMax("1000000") @Digits(integer=7,fraction=2) BigDecimal extraMetrePrice,
        @DecimalMin("0") @DecimalMax("1000000") @Digits(integer=7,fraction=2) BigDecimal segmentPrice,
        @DecimalMin("0.01") @DecimalMax("100000") @Digits(integer=6,fraction=2) BigDecimal segmentLength,
        @DecimalMin("0.01") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal maxAutoHeight,
        @NotNull @Size(max=100) List<@NotNull @Valid HeightRate> heightRates,
        @NotNull @Size(max=100) List<@NotNull @Valid CableRule> cableRules,
        @NotNull @Size(max=100) List<@NotNull @Valid MaterialRate> materials) {}

}
