package com.todo.todowebapp.controller;

import com.todo.todowebapp.config.JwtTokenProvider;
import com.todo.todowebapp.dto.JwtResponse;
import com.todo.todowebapp.dto.LoginRequest;
import com.todo.todowebapp.model.User;
import com.todo.todowebapp.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Error: User not found."));

        String firebaseCustomToken;
        try {
            com.google.firebase.auth.UserRecord userRecord = 
                    com.google.firebase.auth.FirebaseAuth.getInstance().getUserByEmail(user.getEmail());
            firebaseCustomToken = com.google.firebase.auth.FirebaseAuth.getInstance().createCustomToken(userRecord.getUid());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Firebase credentials.", e);
        }

        return ResponseEntity.ok(new JwtResponse(
                firebaseCustomToken,
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                user.isPasswordResetAllowed()
        ));
    }

    @Autowired
    private com.todo.todowebapp.service.OtpService otpService;

    @Autowired
    private com.todo.todowebapp.service.EmailService emailService;

    @PostMapping("/forgot-password/request")
    public ResponseEntity<?> requestPasswordResetOtp(@Valid @RequestBody OtpRequest request) {
        String genericResponse = "If the username is valid and registered with password reset permissions, an OTP has been sent.";
        
        java.util.Optional<User> userOpt = userService.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(genericResponse);
        }

        User user = userOpt.get();
        if (!user.isPasswordResetAllowed()) {
            return ResponseEntity.ok(genericResponse);
        }

        if (otpService.isThrottled(user.getUsername())) {
            return ResponseEntity.status(429).body("Error: Please wait at least 1 minute between OTP requests.");
        }

        try {
            String otpCode = otpService.generateOtp(user.getUsername());
            emailService.sendOtpEmail(user.getEmail(), otpCode);
            return ResponseEntity.ok(genericResponse);
        } catch (Exception e) {
            return ResponseEntity.ok(genericResponse);
        }
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<?> verifyOtpAndResetPassword(@Valid @RequestBody OtpVerifyRequest request) {
        java.util.Optional<User> userOpt = userService.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invalid request.");
        }

        User user = userOpt.get();
        if (!user.isPasswordResetAllowed()) {
            return ResponseEntity.badRequest().body("Error: Password reset not permitted.");
        }

        if (otpService.isBlocked(user.getUsername())) {
            return ResponseEntity.status(429).body("Error: Too many verification attempts. Please request a new OTP.");
        }

        boolean isValid = otpService.validateOtp(user.getUsername(), request.getOtp());
        if (!isValid) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired OTP code.");
        }

        try {
            UserService.validatePassword(request.getNewPassword());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }

        // Update the password
        userService.updateUser(user, null, request.getNewPassword(), "SYSTEM");
        
        // Clean up OTP
        otpService.deleteOtp(user.getUsername());

        return ResponseEntity.ok("Success: Your password has been reset successfully. You can now login with your new password.");
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("OK");
    }

    public static class OtpRequest {
        private String username;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    public static class OtpVerifyRequest {
        private String username;
        private String otp;
        private String newPassword;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
