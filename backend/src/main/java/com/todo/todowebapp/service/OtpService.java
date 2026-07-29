package com.todo.todowebapp.service;

import com.todo.todowebapp.model.PasswordResetOtp;
import com.todo.todowebapp.repository.PasswordResetOtpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    @Autowired
    private PasswordResetOtpRepository otpRepository;

    private final SecureRandom random = new SecureRandom();

<<<<<<< HEAD
    public boolean isThrottled(String username) {
        Optional<PasswordResetOtp> optionalOtp = otpRepository.findByUsername(username);
        if (optionalOtp.isEmpty()) {
            return false;
        }
        PasswordResetOtp otp = optionalOtp.get();
        if (otp.getLastRequestedAt() != null) {
            return otp.getLastRequestedAt().plusMinutes(1).isAfter(LocalDateTime.now());
        }
        return false;
    }

    public boolean isBlocked(String username) {
        Optional<PasswordResetOtp> optionalOtp = otpRepository.findByUsername(username);
        if (optionalOtp.isEmpty()) {
            return false;
        }
        return optionalOtp.get().getAttempts() >= 3;
    }

=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
    @Transactional
    public String generateOtp(String username) {
        // Generate 6-digit OTP code
        int code = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(code);

        // Set expiry to 5 minutes from now
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(5);

        // Find existing OTP or create a new one to avoid duplicate key exceptions due to Hibernate flush order
        PasswordResetOtp otp = otpRepository.findByUsername(username)
                .orElse(new PasswordResetOtp());
        
        otp.setUsername(username);
        otp.setOtpCode(otpCode);
        otp.setExpiryDate(expiryDate);
<<<<<<< HEAD
        otp.setAttempts(0);
        otp.setLastRequestedAt(LocalDateTime.now());
=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925

        otpRepository.save(otp);

        return otpCode;
    }

<<<<<<< HEAD
    @Transactional
=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
    public boolean validateOtp(String username, String otpCode) {
        Optional<PasswordResetOtp> optionalOtp = otpRepository.findByUsername(username);
        if (optionalOtp.isEmpty()) {
            return false;
        }

        PasswordResetOtp otp = optionalOtp.get();
<<<<<<< HEAD
        
        // Check if already blocked
        if (otp.getAttempts() >= 3) {
            return false;
        }

        // Increment attempts on every validation request
        otp.setAttempts(otp.getAttempts() + 1);
        otpRepository.save(otp);

        if (otp.isExpired() || !otp.getOtpCode().equals(otpCode)) {
            if (otp.getAttempts() >= 3) {
                // Delete if it has reached the max failed attempts to clear state
                otpRepository.delete(otp);
            }
=======
        if (otp.isExpired() || !otp.getOtpCode().equals(otpCode)) {
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
            return false;
        }

        return true;
    }

    @Transactional
    public void deleteOtp(String username) {
        otpRepository.deleteByUsername(username);
    }
}
