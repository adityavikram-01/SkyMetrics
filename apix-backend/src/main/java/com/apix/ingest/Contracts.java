package com.apix.ingest;

import java.time.*;
import java.util.List;

import com.apix.domain.Outcome;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class Contracts {
    private Contracts() {
    }

    public record DatasetRequest(@NotBlank String externalId, @NotBlank String modelVersion,
                                 @Pattern(regexp = "[a-f0-9]{64}") String configHash, @NotBlank String canonicalConfig,
                                 boolean synthetic) {
    }

    public record Row(@NotBlank String resultId, @NotBlank String serviceId, @NotBlank String flightId,
                      @Pattern(regexp = "[A-Z]{3}-[A-Z]{3}") String route,
                      @Pattern(regexp = "[A-Z0-9]{2}") String airline, @NotBlank @Size(max = 30) String flightNumber,
                      @NotNull Instant departureAt, @NotNull Instant arrivalAt, @NotNull LocalDate departureDate,
                      @NotNull @Min(1) @Max(45) Integer horizon, @NotNull Outcome outcome, Long totalPaise,
                      @Min(0) int latentRemaining, @Min(0) int latentArrivals, @Min(0) int latentCancellations) {
    }

    public record RunRequest(@NotBlank String datasetId, @NotBlank String runId, @NotNull LocalDate collectionDate,
                             @NotNull Instant observedAt, boolean synthetic,
                             @NotEmpty @Size(max = 10000) List<@Valid Row> results) {
    }
}
