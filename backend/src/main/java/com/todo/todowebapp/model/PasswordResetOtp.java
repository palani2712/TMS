package com.todo.todowebapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_otps")
public class PasswordResetOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "otp_code", nullable = false)
    private String otpCode;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

<<<<<<< HEAD
    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "last_requested_at")
    private LocalDateTime lastRequestedAt;

=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
    public PasswordResetOtp() {
    }

    public PasswordResetOtp(String username, String otpCode, LocalDateTime expiryDate) {
        this.username = username;
        this.otpCode = otpCode;
        this.expiryDate = expiryDate;
<<<<<<< HEAD
        this.attempts = 0;
        this.lastRequestedAt = LocalDateTime.now();
=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getOtpCode() {
        return otpCode;
    }

    public void setOtpCode(String otpCode) {
        this.otpCode = otpCode;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
    }

<<<<<<< HEAD
    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public LocalDateTime getLastRequestedAt() {
        return lastRequestedAt;
    }

    public void setLastRequestedAt(LocalDateTime lastRequestedAt) {
        this.lastRequestedAt = lastRequestedAt;
    }

=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }
}
