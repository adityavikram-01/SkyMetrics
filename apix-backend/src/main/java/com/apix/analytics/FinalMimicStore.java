package com.apix.analytics;

import com.apix.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/** Read-only access to the same master file used to build government reports. */
@Component
public class FinalMimicStore {
    private final JdbcTemplate db;
    public FinalMimicStore(@Value("${skymetrics.mimic.path:}") String path) {
        if (path.isBlank()) { db=null; return; }
        Path file=Path.of(path).toAbsolutePath().normalize();
        if (!Files.isRegularFile(file)) throw new IllegalStateException("Configured final mimic dataset is missing");
        var source=new DriverManagerDataSource();
        source.setDriverClassName("org.sqlite.JDBC");
        source.setUrl("jdbc:sqlite:"+file.toUri()+"?mode=ro");
        db=new JdbcTemplate(source);
    }
    public boolean containsRoute(String route) {
        return enabled() && Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM flight_service WHERE route=?)", Boolean.class, route));
    }
    public boolean enabled(){return db!=null;}
    public String dataset(String id){
        var rows=db.queryForList("SELECT id FROM simulation_dataset WHERE id=? AND is_synthetic=1",String.class,id);
        if(rows.isEmpty())throw new ApiException(404,"Dataset not found");
        return rows.getFirst();
    }
    public LocalDate latest(String id){return LocalDate.parse(Objects.requireNonNull(db.queryForObject("SELECT MAX(collection_date) FROM collection_run WHERE dataset_id=?",String.class,id)));}
    public List<Map<String,Object>> datasets(){return db.queryForList("SELECT id AS datasetId,model_version AS modelVersion,config_hash AS configHash FROM simulation_dataset");}
    public List<Map<String,Object>> catalog(String kind){
        String table=switch(kind){case "routes"->"route";case "airports"->"airport";case "airlines"->"airline";default->throw new ApiException(404,"Unknown catalog");};
        return db.queryForList("SELECT code AS id,code FROM "+table+" ORDER BY code");
    }
    public List<ObservationStore.Observation> rows(String id,String route,String airline,LocalDate start,LocalDate end,LocalDate depStart,LocalDate depEnd,Integer hmin,Integer hmax,Integer month,String flight){
        String localDate="date(d.departure_at,'+5 hours','+30 minutes')";
        StringBuilder sql=new StringBuilder("SELECT c.id,d.id,s.route,s.airline,s.flight_number,r.collection_date,"+localDate+",r.observed_at,d.departure_at,c.horizon,c.outcome,f.total_paise,s.local_time FROM collection_run r JOIN collection_result c ON c.run_id=r.id JOIN flight_departure d ON d.id=c.flight_id JOIN flight_service s ON s.id=d.service_id LEFT JOIN fare_observation f ON f.result_id=c.id WHERE r.dataset_id=? AND r.collection_date BETWEEN ? AND ?");
        if (route != null && !start.equals(end)) {
            String original = "FROM collection_run r JOIN collection_result c ON c.run_id=r.id JOIN flight_departure d ON d.id=c.flight_id JOIN flight_service s ON s.id=d.service_id";
            String bounded = "FROM flight_service s CROSS JOIN flight_departure d ON d.service_id=s.id CROSS JOIN collection_result c ON c.flight_id=d.id CROSS JOIN collection_run r ON r.id=c.run_id";
            sql = new StringBuilder(sql.toString().replace(original, bounded));
        }
        var args=new ArrayList<Object>(List.of(id,start.toString(),end.toString()));
        if(route!=null){sql.append(" AND s.route=?");args.add(route);}
        if(airline!=null){sql.append(" AND s.airline=?");args.add(airline);}
        if(flight!=null){sql.append(" AND d.id=?");args.add(flight);}
        if(depStart!=null){sql.append(" AND "+localDate+">=?");args.add(depStart.toString());}
        if(depEnd!=null){sql.append(" AND "+localDate+"<=?");args.add(depEnd.toString());}
        if(hmin!=null){sql.append(" AND c.horizon BETWEEN ? AND ?");args.add(hmin);args.add(hmax);}
        if(month!=null){sql.append(" AND CAST(strftime('%m',d.departure_at,'+5 hours','+30 minutes') AS INTEGER)=?");args.add(month);}
        sql.append(" ORDER BY r.collection_date");
        return db.query(sql.toString(),(rs,n)->{
            int hour=Integer.parseInt(rs.getString(13).substring(0,2));
            String band=hour<12?"early_morning":hour<17?"daytime":hour<21?"evening":"night";
            return new ObservationStore.Observation(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),LocalDate.parse(rs.getString(6)),LocalDate.parse(rs.getString(7)),Instant.parse(rs.getString(8)),Instant.parse(rs.getString(9)),rs.getInt(10),rs.getString(11),rs.getObject(12)==null?null:rs.getLong(12)/100.0,band);
        },args.toArray());
    }
}
