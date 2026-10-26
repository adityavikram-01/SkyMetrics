package com.apix.commerce;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.sql.DataSource;

/** The existing identity store stays intact; imported commerce data is read separately. */
@Configuration
public class CommerceDatabase {
 @Bean("commerceJdbc") JdbcTemplate commerceJdbc(
  @Value("${commerce.db.url:}") String url,
  @Value("${commerce.db.username:}") String username,
  @Value("${commerce.db.password:}") String password) {
  if(url.isBlank()) throw new IllegalStateException("COMMERCE_DB_URL is required for the imported flight dataset");
  HikariConfig config=new HikariConfig();config.setJdbcUrl(url);config.setUsername(username);config.setPassword(password);
  config.setMaximumPoolSize(4);config.setMinimumIdle(1);config.setReadOnly(true);config.setPoolName("commerce-read");
  config.setConnectionTimeout(10000);
  return new JdbcTemplate(new HikariDataSource(config));
 }
 @Bean @org.springframework.context.annotation.Primary JdbcTemplate jdbcTemplate(DataSource source) { return new JdbcTemplate(source); }
}
