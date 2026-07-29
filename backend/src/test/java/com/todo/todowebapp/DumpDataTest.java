package com.todo.todowebapp;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

public class DumpDataTest {

    @Test
    @org.junit.jupiter.api.Disabled
    public void dumpAivenData() throws Exception {
        String url = System.getenv("AIVEN_DB_URL") != null ? System.getenv("AIVEN_DB_URL") : "jdbc:mysql://localhost:3306/defaultdb";
        String username = System.getenv("AIVEN_DB_USER") != null ? System.getenv("AIVEN_DB_USER") : "avnadmin";
        String password = System.getenv("AIVEN_DB_PASSWORD") != null ? System.getenv("AIVEN_DB_PASSWORD") : "placeholder";

        System.out.println("=== CONNECTING TO AIVEN SQL ===");
        try (Connection conn = DriverManager.getConnection(url, username, password)) {
            System.out.println("Connected successfully!");

            String[] tables = {"users", "tasks", "comments", "audit_logs", "user_pinned_tasks"};
            for (String table : tables) {
                System.out.println("\n--- TABLE: " + table + " ---");
                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SELECT * FROM " + table)) {
                    
                    ResultSetMetaData metaData = rs.getMetaData();
                    int columnCount = metaData.getColumnCount();

                    // Print headers
                    for (int i = 1; i <= columnCount; i++) {
                        System.out.print(metaData.getColumnName(i) + "\t");
                    }
                    System.out.println();

                    // Print rows
                    int rowCount = 0;
                    while (rs.next()) {
                        rowCount++;
                        for (int i = 1; i <= columnCount; i++) {
                            String colName = metaData.getColumnName(i).toLowerCase();
                            String val = rs.getString(i);
                            if (colName.contains("password") || colName.contains("otp") || colName.contains("secret")) {
                                val = "[REDACTED]";
                            }
                            System.out.print(val + "\t");
                        }
                        System.out.println();
                    }
                    System.out.println("Total rows: " + rowCount);
                } catch (Exception e) {
                    System.out.println("Could not read table " + table + ": " + e.getMessage());
                }
            }
        }
    }

    @Test
    public void testFirebaseConnection() throws Exception {
        System.out.println("=== TESTING FIREBASE CONNECTION ===");
        java.io.File file = new java.io.File("firebase-service-account.json");
        if (!file.exists()) {
            file = new java.io.File("backend/firebase-service-account.json");
        }
        if (!file.exists()) {
            throw new RuntimeException("firebase-service-account.json does not exist!");
        }
        com.google.auth.oauth2.GoogleCredentials credentials = com.google.auth.oauth2.GoogleCredentials.fromStream(new java.io.FileInputStream(file));
        System.out.println("Loaded credentials successfully! Project ID: " + ((com.google.auth.oauth2.ServiceAccountCredentials) credentials).getProjectId());
        
        com.google.firebase.FirebaseOptions options = com.google.firebase.FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();
        if (com.google.firebase.FirebaseApp.getApps().isEmpty()) {
            com.google.firebase.FirebaseApp.initializeApp(options);
        }
        
        try {
            com.google.firebase.auth.FirebaseAuth.getInstance().getUserByEmail("test@example.com");
            System.out.println("Firebase Auth communication succeeded!");
        } catch (com.google.firebase.auth.FirebaseAuthException e) {
            System.out.println("Firebase Auth returned exception: " + e.getMessage() + ", ErrorCode: " + e.getAuthErrorCode());
        }
    }
}