package com.apix.commerce.repository;

import com.apix.commerce.model.CommerceObservation;
import com.apix.commerce.model.CommerceObservationId;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Bounded projections: never load an entire observation history as an entity graph. */
public interface CommerceObservationRepository extends Repository<CommerceObservation, CommerceObservationId> {
    interface Offer {
        Long getDepartureId(); String getAirline(); String getFlightNumber();
        LocalDateTime getDepartureAt(); LocalDateTime getArrivalAt();
        Long getTotalPaise(); Integer getBookableSeats();
    }
    interface History {
        LocalDate getCollectionDate(); Integer getHorizon(); String getOutcome();
        Long getTotalPaise(); Integer getBookableSeats();
    }
    @Query(value="""
        SELECT d.id AS departureId, s.airline AS airline, s.flight_number AS flightNumber,
               d.departure_at AS departureAt, d.arrival_at AS arrivalAt,
               (o.base_paise+o.tax_paise+o.fee_paise) AS totalPaise, (o.bookable_seats-COALESCE((SELECT SUM(FLOOR(o.bookable_seats*c.capacity/s.capacity))
                FROM cm_service_cabin c WHERE c.service_id=s.id AND c.cabin<>'ECONOMY'),0)) AS bookableSeats
        FROM cm_service s JOIN cm_departure d ON d.service_id=s.id
        JOIN cm_observation o ON o.departure_id=d.id AND o.collection_date=:observed
        WHERE s.route=:route AND d.travel_date=:travel AND o.outcome='AVAILABLE'
        ORDER BY (o.base_paise+o.tax_paise+o.fee_paise), d.id
        """, nativeQuery=true)
    Slice<Offer> search(@Param("route") String route, @Param("travel") LocalDate travel,
                        @Param("observed") LocalDate observed, Pageable page);

    @Query(value="""
        SELECT collection_date AS collectionDate, horizon AS horizon, outcome AS outcome,
               (base_paise+tax_paise+fee_paise) AS totalPaise, bookable_seats AS bookableSeats
        FROM cm_observation WHERE departure_id=:departure AND collection_date BETWEEN :start AND :end
        ORDER BY collection_date DESC
        """, nativeQuery=true)
    Slice<History> history(@Param("departure") long departure, @Param("start") LocalDate start,
                          @Param("end") LocalDate end, Pageable page);
}
