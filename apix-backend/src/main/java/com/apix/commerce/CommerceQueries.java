package com.apix.commerce;

import com.apix.commerce.repository.CommerceObservationRepository;
import java.time.LocalDate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class CommerceQueries {
    private final CommerceObservationRepository observations;
    public CommerceQueries(CommerceObservationRepository observations) { this.observations=observations; }
    public Slice<CommerceObservationRepository.Offer> search(String route, LocalDate travel, LocalDate observed, int page) {
        if (route==null || !route.matches("[A-Z]{3}-[A-Z]{3}") || travel==null || observed==null || page<0 || page>100)
            throw new IllegalArgumentException("Invalid route, dates or page");
        return observations.search(route,travel,observed,PageRequest.of(page,50));
    }
    public Slice<CommerceObservationRepository.History> history(long departure, LocalDate start, LocalDate end, int page) {
        if (departure<=0 || start==null || end==null || end.isBefore(start) || page<0 || page>100)
            throw new IllegalArgumentException("Invalid departure, dates or page");
        return observations.history(departure,start,end,PageRequest.of(page,60));
    }
}
