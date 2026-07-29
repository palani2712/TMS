package com.todo.todowebapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class FirebaseConfig {
    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @PostConstruct
    public void initialize() {
        logger.info("Initializing Firebase App...");
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = null;

                // 1. Try loading from path specified in environment variable FIREBASE_CREDENTIALS_PATH
                try {
                    String credentialsPath = System.getenv("FIREBASE_CREDENTIALS_PATH");
                    if (credentialsPath != null && !credentialsPath.trim().isEmpty()) {
                        java.io.File file = new java.io.File(credentialsPath);
                        if (file.exists()) {
                            logger.info("Loading Firebase credentials from specified path.");
                            options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(new java.io.FileInputStream(file)))
                                    .build();
                        } else {
                            logger.warn("Credentials file specified in FIREBASE_CREDENTIALS_PATH does not exist.");
                        }
                    }
                } catch (Exception e) {
                    logger.error("Could not load credentials from FIREBASE_CREDENTIALS_PATH");
                }

                // 2. Try loading from default Render secrets path (/etc/secrets/firebase-service-account.json)
                if (options == null) {
                    try {
                        java.io.File renderSecretFile = new java.io.File("/etc/secrets/firebase-service-account.json");
                        if (renderSecretFile.exists()) {
                            logger.info("Loading Firebase credentials from default Render secrets path.");
                            options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(new java.io.FileInputStream(renderSecretFile)))
                                    .build();
                        }
                    } catch (Exception e) {
                        logger.error("Could not load credentials from Render secrets file");
                    }
                }

                // 3. Try loading from environment variable
                if (options == null) {
                    try {
                        String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                        if (serviceAccountJson != null && !serviceAccountJson.trim().isEmpty()) {
                            logger.info("Loading Firebase credentials from environment variable.");
                            String sanitizedJson = serviceAccountJson.replace("\\n", "\n");
                            options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(new java.io.ByteArrayInputStream(sanitizedJson.getBytes())))
                                    .build();
                        }
                    } catch (Exception e) {
                        logger.error("Could not load credentials from environment variable");
                    }
                }

                // 4. Try loading from Application Default Credentials
                if (options == null) {
                    try {
                        logger.info("Attempting fallback to Google Application Default Credentials...");
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.getApplicationDefault())
                                .build();
                    } catch (Exception e) {
                        logger.warn("Failed to load Application Default Credentials.");
                    }
                }

                if (options != null) {
                    FirebaseApp.initializeApp(options);
                    logger.info("FirebaseApp initialized successfully.");
                } else {
                    throw new IllegalStateException("No valid Firebase credentials found. Failing closed.");
                }
            } else {
                logger.info("FirebaseApp already initialized.");
            }
        } catch (Exception e) {
            logger.error("FirebaseConfig critical error during initialization: {}", e.getMessage());
            throw new IllegalStateException("Failed to initialize FirebaseApp", e);
        }
    }
}
