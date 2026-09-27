package com.apix;

import com.apix.ingest.IngestionService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IngestionHashTest {
    @Test
    void payloadHashIsStableAndByteSensitive() {
        assertThat(IngestionService.hash("same bytes"))
                .isEqualTo(IngestionService.hash("same bytes"))
                .isNotEqualTo(IngestionService.hash("same bytes "));
    }
}
