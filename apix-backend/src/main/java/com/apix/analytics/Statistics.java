package com.apix.analytics;

import java.util.*;

public final class Statistics {
    private Statistics() {
    }

    public static double quantile(List<Double> values, double q) {
        if (values.isEmpty()) return Double.NaN;
        var x = values.stream().sorted().toList();
        double p = (x.size() - 1) * q;
        int i = (int) p;
        return x.get(i) + (x.get(Math.min(i + 1, x.size() - 1)) - x.get(i)) * (p - i);
    }

    public static double median(List<Double> x) {
        return quantile(x, .5);
    }

    public static double round(double n) {
        return Math.round(n * 100.0) / 100.0;
    }

    public static Map<String, Object> summarize(List<Double> x) {
        var out = new LinkedHashMap<String, Object>();
        out.put("count", x.size());
        if (x.isEmpty()) {
            out.put("status", "INSUFFICIENT_DATA");
            return out;
        }
        double mean = x.stream().mapToDouble(v -> v).average().orElseThrow();
        double sd = Math.sqrt(x.stream().mapToDouble(v -> Math.pow(v - mean, 2)).average().orElseThrow());
        out.put("mean", round(mean));
        out.put("median", round(median(x)));
        out.put("minimum", Collections.min(x));
        out.put("maximum", Collections.max(x));
        out.put("standardDeviation", round(sd));
        out.put("coefficientOfVariation", mean == 0 ? null : round(sd / Math.abs(mean)));
        for (int p : new int[]{10, 25, 75, 90, 95}) out.put("p" + p, round(quantile(x, p / 100.0)));
        return out;
    }
}
