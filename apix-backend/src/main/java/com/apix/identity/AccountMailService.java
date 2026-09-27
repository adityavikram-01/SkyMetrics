package com.apix.identity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

import java.time.OffsetDateTime;

@Service
public class AccountMailService {
    private static final Logger log = LoggerFactory.getLogger(AccountMailService.class);
    private final ObjectProvider<JavaMailSender> senders;
    private final String sender;
    private final String host;
    private final String username;
    private final String password;

    public AccountMailService(ObjectProvider<JavaMailSender> senders,
                              @Value("${SKYMETRICS_MAIL_FROM:}") String sender,
                              @Value("${SKYMETRICS_SMTP_HOST:}") String host,
                              @Value("${SKYMETRICS_SMTP_USERNAME:}") String username,
                              @Value("${SKYMETRICS_SMTP_PASSWORD:}") String password) {
        this.senders = senders;
        this.sender = sender;
        this.host = host;
        this.username = username;
        this.password = password;
    }

    public boolean configured() { return !sender.isBlank() && !host.isBlank() && !username.isBlank() && !password.isBlank() && senders.getIfAvailable() != null; }

    @Async
    public void loginNotice(String address) {
        send(address, "New SkyMetrics sign-in", "Your SkyMetrics account was signed in at " + OffsetDateTime.now() + ".\nIf this was not you, contact the SkyMetrics owner immediately.");
    }

    private void send(String to, String subject, String body) {
        if (!configured()) return;
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            senders.getObject().send(message);
        } catch (Exception error) {
            log.warn("Account email delivery failed for {}: {}", to, error.getClass().getSimpleName());
        }
    }
}
