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

    @Transactional
    public String generateOtp(String username) {
        // Delete any existing OTP for this user
        otpRepository.deleteByUsername(username);

        // Generate 6-digit OTP code
        int code = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(code);

        // Set expiry to 5 minutes from now
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(5);

        PasswordResetOtp otp = new PasswordResetOtp(username, otpCode, expiryDate);
        otpRepository.save(otp);

        return otpCode;
    }

    public boolean validateOtp(String username, String otpCode) {
        Optional<PasswordResetOtp> optionalOtp = otpRepository.findByUsername(username);
        if (optionalOtp.isEmpty()) {
            return false;
        }

        PasswordResetOtp otp = optionalOtp.get();
        if (otp.isExpired() || !otp.getOtpCode().equals(otpCode)) {
            return false;
        }

        return true;
    }

    @Transactional
    public void deleteOtp(String username) {
        otpRepository.deleteByUsername(username);
    }
}
