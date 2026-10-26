package com.apix.commerce;

import com.apix.commerce.model.*;
import com.apix.commerce.repository.CommerceObservationRepository;
import com.apix.commerce.repository.CommerceRouteSummaryRepository;
import org.springframework.data.domain.PageRequest;
import org.hibernate.Hibernate;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in test against the imported local dataset, never an in-memory SQL substitute. */
@EnabledIfEnvironmentVariable(named="SM_COMMERCE_TEST_URL", matches=".+")
class CommerceMysqlTest {
 @Test void validatesSchemaLazyRelationsAndBoundedQueries() {
  Configuration c=new Configuration();
  c.setProperty("hibernate.connection.url",System.getenv("SM_COMMERCE_TEST_URL"));
  c.setProperty("hibernate.connection.username",System.getenv("SM_COMMERCE_TEST_USER"));
  c.setProperty("hibernate.connection.password",System.getenv("SM_COMMERCE_TEST_PASSWORD"));
  c.setProperty("hibernate.hbm2ddl.auto","validate");
  c.setProperty("hibernate.jdbc.time_zone","UTC");
  for (Class<?> type : new Class<?>[]{CommerceDataset.class,CommerceAirport.class,CommerceAirline.class,
      CommerceRoute.class,CommerceService.class,CommerceDeparture.class,CommerceFareProduct.class,
      CommerceServiceRating.class,CommerceSourceRecord.class,CommerceSchemaRevision.class,
      CommerceCalibrationSource.class,CommerceOfferPolicy.class,CommerceServiceCabin.class,
      CommerceRatingComponent.class,CommerceRouteServiceProfile.class,CommerceConnectionRule.class,
      CommerceObservation.class,CommerceRouteDaySummary.class}) c.addAnnotatedClass(type);
  try(var factory=c.buildSessionFactory();var em=factory.createEntityManager()) {
   var repo=new JpaRepositoryFactory(em).getRepository(CommerceObservationRepository.class);
   var service=new CommerceQueries(repo);
   var offers=service.search("BOM-DEL",LocalDate.of(2026,10,26),LocalDate.of(2026,10,5),0);
   assertFalse(offers.isEmpty());assertTrue(offers.getNumberOfElements()<=50);
   var offer=offers.getContent().getFirst();assertTrue(offer.getTotalPaise()>0);
   var departure=em.find(CommerceDeparture.class,offer.getDepartureId());
   assertFalse(Hibernate.isInitialized(departure.serviceIdRef));
   var history=service.history(offer.getDepartureId(),LocalDate.of(2024,1,1),LocalDate.of(2027,1,1),0);
   assertFalse(history.isEmpty());assertTrue(history.getNumberOfElements()<=60);
   assertTrue(history.getContent().stream().anyMatch(h->h.getCollectionDate().equals(LocalDate.of(2026,10,5))));
   var summaries=new JpaRepositoryFactory(em).getRepository(CommerceRouteSummaryRepository.class);
   var daily=summaries.history("BOM-DEL",LocalDate.of(2026,9,1),LocalDate.of(2026,10,5),PageRequest.of(0,31));
   assertEquals(31,daily.getNumberOfElements());assertTrue(daily.hasNext());
   assertTrue(daily.getContent().getFirst().getAvailableCount()>0);
   assertThrows(IllegalArgumentException.class,()->service.search("invalid",LocalDate.now(),LocalDate.now(),0));
  }
 }
}
