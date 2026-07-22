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
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = null;

                // 1. Try loading from classpath resource
                try (java.io.InputStream serviceAccountStream = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json")) {
                    if (serviceAccountStream != null) {
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                                .build();
                    }
                } catch (Exception e) {
                    // Ignore and try next method
                }

                // 2. Try loading from environment variable
                if (options == null) {
                    String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                    if (serviceAccountJson != null && !serviceAccountJson.trim().isEmpty()) {
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(new java.io.ByteArrayInputStream(serviceAccountJson.getBytes())))
                                .build();
                    }
                }

                // 3. Fallback to application default credentials
                if (options == null) {
                    options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.getApplicationDefault())
                            .build();
                }

                FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.create(new com.google.auth.oauth2.AccessToken("mock-token", new java.util.Date(Long.MAX_VALUE))))
                        .setProjectId("todowebapp-b8e27")
                        .build();
                FirebaseApp.initializeApp(options);
            }
        }
    }
}
