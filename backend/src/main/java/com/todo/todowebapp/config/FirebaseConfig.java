package com.todo.todowebapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        System.out.println("=== INITIALIZING FIREBASE APP ===");
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = null;

                // 1. Try loading from classpath resource
                try {
                    org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("firebase-service-account.json");
                    if (resource.exists()) {
                        System.out.println("FirebaseConfig: Found firebase-service-account.json in classpath resources.");
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(resource.getInputStream()))
                                .build();
                        System.out.println("FirebaseConfig: Successfully loaded credentials from classpath resource.");
                    } else {
                        System.out.println("FirebaseConfig: firebase-service-account.json NOT found on classpath.");
                    }
                } catch (Exception e) {
                    System.err.println("FirebaseConfig Error: Could not load firebase-service-account.json from classpath: " + e.getMessage());
                    e.printStackTrace();
                }

                // 2. Try loading from environment variable
                if (options == null) {
                    System.out.println("FirebaseConfig: Attempting to load from environment variable FIREBASE_SERVICE_ACCOUNT_JSON...");
                    String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                    if (serviceAccountJson != null && !serviceAccountJson.trim().isEmpty()) {
                        String sanitizedJson = serviceAccountJson.replace("\\n", "\n");
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(new java.io.ByteArrayInputStream(sanitizedJson.getBytes())))
                                .build();
                        System.out.println("FirebaseConfig: Successfully loaded credentials from environment variable.");
                    } else {
                        System.out.println("FirebaseConfig: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is empty or not set.");
                    }
                }

                // 3. Fallback to application default credentials
                if (options == null) {
                    System.out.println("FirebaseConfig: Attempting fallback to Google Application Default Credentials...");
                    try {
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.getApplicationDefault())
                                .build();
                        System.out.println("FirebaseConfig: Successfully loaded Application Default Credentials.");
                    } catch (Exception e) {
                        System.err.println("FirebaseConfig: Failed to load Application Default Credentials: " + e.getMessage());
                    }
                }

                if (options != null) {
                    FirebaseApp.initializeApp(options);
                    System.out.println("FirebaseConfig: FirebaseApp initialized successfully with configuration.");
                } else {
                    throw new IllegalStateException("FirebaseConfig: No credentials found, failed to initialize FirebaseApp.");
                }
            } else {
                System.out.println("FirebaseConfig: FirebaseApp already initialized.");
            }
        } catch (Exception e) {
            System.err.println("FirebaseConfig critical error during initialization: " + e.getMessage());
            e.printStackTrace();
            if (FirebaseApp.getApps().isEmpty()) {
                System.out.println("FirebaseConfig: Falling back to mock token initialization.");
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.create(new com.google.auth.oauth2.AccessToken("mock-token", new java.util.Date(Long.MAX_VALUE))))
                        .setProjectId("todowebapp-b8e27")
                        .build();
                FirebaseApp.initializeApp(options);
            }
        }
    }
}
