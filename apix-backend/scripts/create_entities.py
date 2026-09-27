from pathlib import Path

root = Path('src/main/java/com/apix/domain')
base = '''package com.apix.domain;
import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
'''
(root / 'BaseEntity.java').write_text(base + '''@MappedSuperclass
public abstract class BaseEntity {
 @Id @Column(length=36) public String id = java.util.UUID.randomUUID().toString();
}
''')
entities = {
    'Airport': ('airport', '@Column(nullable=false,unique=true,length=3) public String code;'),
    'Airline': ('airline', '@Column(nullable=false,unique=true,length=2) public String code;'),
    'Route': ('route',
              '@Column(nullable=false,unique=true,length=7) public String code;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="origin_id") public Airport origin;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="destination_id") public Airport destination;'),
    'DataSource': ('data_source',
                   '@Column(nullable=false,unique=true,length=40) public String code;\n@Column(nullable=false) public boolean synthetic=true;'),
    'Dataset': ('dataset',
                '@Column(nullable=false,unique=true,length=36) public String externalId;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="source_id") public DataSource source;\n@Column(nullable=false,length=40) public String modelVersion;\n@Column(nullable=false,length=64) public String configHash;\n@Column(nullable=false,columnDefinition="LONGTEXT") public String canonicalConfig;\n@Column(nullable=false) public boolean synthetic=true;'),
    'FareProduct': ('fare_product',
                    '@Column(nullable=false,unique=true,length=60) public String code;\n@Column(nullable=false,length=20) public String cabin="ECONOMY";\n@Column(nullable=false) public int adults=1;\n@Column(nullable=false) public boolean nonstop=true;\n@Column(nullable=false) public boolean oneWay=true;'),
    'FlightService': ('flight_service',
                      '@Column(nullable=false,unique=true,length=36) public String externalId;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="route_id") public Route route;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="airline_id") public Airline airline;\n@Column(nullable=false,length=30) public String flightNumber;\n@Column(nullable=false) public LocalTime localTime;'),
    'FlightDeparture': ('flight_departure',
                        '@Column(nullable=false,unique=true,length=36) public String externalId;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="service_id") public FlightService service;\n@Column(nullable=false) public LocalDate departureDate;\n@Column(nullable=false,columnDefinition="DATETIME(6)") public Instant departureAt;\n@Column(nullable=false,columnDefinition="DATETIME(6)") public Instant arrivalAt;\n@Column(nullable=false,length=20) public String timeBand;'),
    'CollectionRun': ('collection_run',
                      '@Column(nullable=false,length=36) public String externalId;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="dataset_id") public Dataset dataset;\n@Column(nullable=false) public LocalDate collectionDate;\n@Column(nullable=false,columnDefinition="DATETIME(6)") public Instant observedAt;\n@Column(nullable=false,length=100) public String idempotencyKey;\n@Column(nullable=false,length=64) public String payloadHash;\n@Column(nullable=false) public int resultCount;'),
    'CollectionResult': ('collection_result',
                         '@Column(nullable=false,length=36) public String externalId;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="run_id") public CollectionRun run;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="departure_id") public FlightDeparture departure;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="product_id") public FareProduct product;\n@Column(nullable=false) public int horizon;\n@Enumerated(EnumType.STRING) @Column(nullable=false,length=20) public Outcome outcome;'),
    'FareObservation': ('fare_observation',
                        '@OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="result_id",nullable=false,unique=true) public CollectionResult result;\n@Column(precision=12,scale=2) public BigDecimal totalAmount;\n@Column(nullable=false,length=3) public String currency="INR";\n@Column(nullable=false) public boolean synthetic=true;'),
    'SimulationInventoryState': ('simulation_inventory_state',
                                 '@OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="result_id",nullable=false,unique=true) public CollectionResult result;\n@Column(nullable=false) public int remaining;\n@Column(nullable=false) public int arrivals;\n@Column(nullable=false) public int cancellations;'),
    'CalendarEvent': ('calendar_event',
                      '@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="dataset_id") public Dataset dataset;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="route_id") public Route route;\n@Column(nullable=false,length=100) public String name;\n@Column(nullable=false) public LocalDate eventDate;\n@Column(nullable=false) public LocalDate windowStart;\n@Column(nullable=false) public LocalDate windowEnd;\n@Column(nullable=false,length=80) public String dateSource;'),
    'PriceAlert': ('price_alert',
                   '@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="dataset_id") public Dataset dataset;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="route_id") public Route route;\n@Column(nullable=false) public LocalDate departureDate;\n@Column(nullable=false,precision=12,scale=2) public BigDecimal threshold;\n@Column(nullable=false) public boolean active=true;'),
    'AlertNotification': ('alert_notification',
                          '@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="alert_id") public PriceAlert alert;\n@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="result_id") public CollectionResult result;\n@Column(nullable=false,precision=12,scale=2) public BigDecimal amount;\n@Column(nullable=false,columnDefinition="DATETIME(6)") public Instant observedAt;')}
for name, (table, fields) in entities.items():
    (root / f'{name}.java').write_text(
        base + f'@Entity @Table(name="{table}")\npublic class {name} extends BaseEntity {{\n {fields}\n}}\n')
(root / 'Outcome.java').write_text('''package com.apix.domain;
public enum Outcome {
 AVAILABLE, SOLD_OUT, NO_OFFER, TIMEOUT, SOURCE_BLOCKED, PARSE_ERROR, RATE_LIMITED;
 public boolean success(){return this==AVAILABLE||this==SOLD_OUT||this==NO_OFFER;}
}
''')
