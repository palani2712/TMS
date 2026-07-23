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
        String url = "jdbc:mysql://mysql-1af9c421-palaniappan2712-5763.a.aivencloud.com:18283/defaultdb?ssl-mode=REQUIRED";
        String username = "avnadmin";
        String password = "AVNS_nXZnrOKJ5FrIA6D5N9n";

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
                            System.out.print(rs.getString(i) + "\t");
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
        org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("firebase-service-account.json");
        if (!resource.exists()) {
            throw new RuntimeException("firebase-service-account.json does not exist on classpath!");
        }
        com.google.auth.oauth2.GoogleCredentials credentials = com.google.auth.oauth2.GoogleCredentials.fromStream(resource.getInputStream());
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