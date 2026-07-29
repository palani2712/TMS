package com.todo.todowebapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
<<<<<<< HEAD
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
=======
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class FirebaseConfig {
<<<<<<< HEAD
    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @PostConstruct
    public void initialize() {
        logger.info("Initializing Firebase App...");
=======

    @PostConstruct
    public void initialize() {
        System.out.println("=== INITIALIZING FIREBASE APP ===");
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = null;

                // 1. Try loading from path specified in environment variable FIREBASE_CREDENTIALS_PATH
                try {
                    String credentialsPath = System.getenv("FIREBASE_CREDENTIALS_PATH");
                    if (credentialsPath != null && !credentialsPath.trim().isEmpty()) {
                        java.io.File file = new java.io.File(credentialsPath);
                        if (file.exists()) {
<<<<<<< HEAD
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
=======
                            System.out.println("FirebaseConfig: Found credentials file at path: " + credentialsPath);
                            options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(new java.io.FileInputStream(file)))
                                    .build();
                            System.out.println("FirebaseConfig: Successfully loaded credentials from specified path.");
                        } else {
                            System.out.println("FirebaseConfig: File specified in FIREBASE_CREDENTIALS_PATH does not exist: " + credentialsPath);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("FirebaseConfig Error: Could not load credentials from FIREBASE_CREDENTIALS_PATH: " + e.getMessage());
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
                }

                // 2. Try loading from default Render secrets path (/etc/secrets/firebase-service-account.json)
                if (options == null) {
                    try {
                        java.io.File renderSecretFile = new java.io.File("/etc/secrets/firebase-service-account.json");
                        if (renderSecretFile.exists()) {
<<<<<<< HEAD
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
=======
                            System.out.println("FirebaseConfig: Found credentials file at default Render secrets path.");
                            options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(new java.io.FileInputStream(renderSecretFile)))
                                    .build();
                            System.out.println("FirebaseConfig: Successfully loaded credentials from default Render secrets path.");
                        }
                    } catch (Exception e) {
                        System.err.println("FirebaseConfig Error: Could not load credentials from Render secrets file: " + e.getMessage());
                    }
                }

                // 3. Try loading from classpath resource
                if (options == null) {
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
                }

                // 4. Try loading from environment variable
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
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
                    }
                }

                if (options != null) {
                    FirebaseApp.initializeApp(options);
<<<<<<< HEAD
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
=======
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
>>>>>>> 6427241b789b24d9ecc4d2508386e405aeb4a925
        }
    }
}
