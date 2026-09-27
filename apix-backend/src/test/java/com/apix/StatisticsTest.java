package com.apix;

import com.apix.analytics.Statistics;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StatisticsTest {
    @Test
    void calculatesInterpolatedQuantilesAndSummary() {
        var values = List.of(100.0, 200.0, 300.0, 400.0);

        assertThat(Statistics.median(values)).isEqualTo(250.0);
        assertThat(Statistics.quantile(values, 0.25)).isEqualTo(175.0);
        assertThat(Statistics.summarize(values))
                .containsEntry("count", 4)
                .containsEntry("mean", 250.0)
                .containsEntry("minimum", 100.0)
                .containsEntry("maximum", 400.0);
    }

    @Test
    void reportsInsufficientDataForAnEmptySeries() {
        assertThat(Statistics.summarize(List.of()))
                .containsEntry("count", 0)
                .containsEntry("status", "INSUFFICIENT_DATA");
    }
}
