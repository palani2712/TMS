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
        String jwt = jwtTokenProvider.generateJwtToken(authentication);

        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Error: User not found."));

        return ResponseEntity.ok(new JwtResponse(
                jwt,
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
        java.util.Optional<User> userOpt = userService.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Username not found.");
        }

        User user = userOpt.get();
        if (user.getEmail() == null || !user.getEmail().equalsIgnoreCase(request.getEmail().trim())) {
            return ResponseEntity.badRequest().body("Error: Email ID does not match the registered email for this username.");
        }

        try {
            String otpCode = otpService.generateOtp(user.getUsername());
            emailService.sendOtpEmail(user.getEmail(), otpCode);
            return ResponseEntity.ok("Success: A 6-digit OTP has been sent to your registered email address.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<?> verifyOtpAndResetPassword(@Valid @RequestBody OtpVerifyRequest request) {
        java.util.Optional<User> userOpt = userService.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Username not found.");
        }

        User user = userOpt.get();
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

    @GetMapping("/email-by-username")
    public ResponseEntity<?> getEmailByUsername(@RequestParam String username) {
        return userService.findByUsername(username)
                .map(user -> ResponseEntity.ok(user.getEmail()))
                .orElse(ResponseEntity.notFound().build());
    }

    public static class OtpRequest {
        private String username;
        private String email;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
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
