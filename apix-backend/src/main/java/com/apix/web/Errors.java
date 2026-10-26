package com.apix.web;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> api(ApiException e) {
        return problem(e.status, e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ProblemDetail> bad(Exception e) {
        return problem(400, "Invalid request. Check dates, identifiers, amounts and required fields.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> conflict(Exception e) {
        return problem(409, "Duplicate or inconsistent data; the transaction was rolled back.");
    }

    private ResponseEntity<ProblemDetail> problem(int status, String message) {
        var p = ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(status), message);
        return ResponseEntity.status(status).body(p);
    }
}
