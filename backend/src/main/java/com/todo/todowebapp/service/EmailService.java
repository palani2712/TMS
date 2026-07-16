package com.todo.todowebapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.util.logging.Logger;
import java.util.logging.Level;

@Service
public class EmailService {

    private static final Logger LOGGER = Logger.getLogger(EmailService.class.getName());

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("TMS Password Reset OTP");
            message.setText("Hello,\n\n" +
                    "You requested a password reset for your account.\n" +
                    "Your 6-digit One-Time Password (OTP) is: " + otpCode + "\n\n" +
                    "This OTP is valid for 5 minutes. Do not share this code with anyone.\n\n" +
                    "Regards,\n" +
                    "Task Management System (TMS) Team");
            mailSender.send(message);
            LOGGER.info("OTP email successfully sent to: " + toEmail);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to send OTP email to " + toEmail + ". Error: " + e.getMessage(), e);
            throw new RuntimeException("Error: Failed to send OTP email. Details: " + e.getMessage());
        }
    }
}
