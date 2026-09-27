package com.apix.domain;

public enum Outcome {
    AVAILABLE, SOLD_OUT, NO_OFFER, TIMEOUT, SOURCE_BLOCKED, PARSE_ERROR, RATE_LIMITED;

    public boolean success() {
        return this == AVAILABLE || this == SOLD_OUT || this == NO_OFFER;
    }
}
