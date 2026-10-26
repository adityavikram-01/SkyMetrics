package com.apix.commerce.repository;

import com.apix.commerce.model.CommerceRouteDaySummary;
import com.apix.commerce.model.CommerceRouteDaySummaryId;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** These are descriptive economy means, not the government's matched-basket index. */
public interface CommerceRouteSummaryRepository extends Repository<CommerceRouteDaySummary,CommerceRouteDaySummaryId> {
 interface Daily {
  LocalDate getCollectionDate(); Integer getAttempts(); Integer getAvailableCount();
  Long getTotalPaise(); Long getMinPaise(); Long getMaxPaise();
 }
 @Query(value="""
   SELECT collection_date AS collectionDate,attempts,available_count AS availableCount,
          total_paise AS totalPaise,min_paise AS minPaise,max_paise AS maxPaise
   FROM cm_route_day_summary WHERE route=:route AND collection_date BETWEEN :start AND :end
   ORDER BY collection_date DESC
   """,nativeQuery=true)
 Slice<Daily> history(@Param("route") String route,@Param("start") LocalDate start,
                      @Param("end") LocalDate end,Pageable page);
}
