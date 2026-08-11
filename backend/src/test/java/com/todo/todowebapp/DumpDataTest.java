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

    @Test
    @org.junit.jupiter.api.Disabled
    public void migrateData() throws Exception {
        String mysqlUrl = "jdbc:mysql://mysql-1af9c421-palaniappan2712-5763.a.aivencloud.com:18283/defaultdb?ssl-mode=REQUIRED";
        String mysqlUser = "avnadmin";
        String mysqlPass = "AVNS_nXZnrOKJ5FrIA6D5N9n";

        String pgUrl = "jdbc:postgresql://db.vegvztrajlkhljklxpyi.supabase.co:5432/postgres";
        String pgUser = "postgres";
        String pgPass = "TaskManagementSystem@123";

        System.out.println("=== STARTING MIGRATION ===");
        try (Connection mysqlConn = DriverManager.getConnection(mysqlUrl, mysqlUser, mysqlPass);
             Connection pgConn = DriverManager.getConnection(pgUrl, pgUser, pgPass)) {
            
            System.out.println("Connected to both databases successfully!");

            // 1. Truncate target tables in PostgreSQL
            try (Statement pgStmt = pgConn.createStatement()) {
                pgStmt.execute("TRUNCATE TABLE user_pinned_tasks, comments, notifications, audit_logs, tasks, users, password_reset_otps CASCADE");
                System.out.println("Target tables truncated successfully.");
            }

            // 2. Migrate users
            String selectUsers = "SELECT id, contact_number, email, full_name, password, password_reset_allowed, password_reset_granted_at, role, username, manager_id FROM users ORDER BY id ASC";
            String insertUser = "INSERT INTO users (id, contact_number, email, full_name, password, password_reset_allowed, password_reset_granted_at, role, username, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectUsers);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertUser)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setString(2, rs.getString("contact_number"));
                    pgStmt.setString(3, rs.getString("email"));
                    pgStmt.setString(4, rs.getString("full_name"));
                    pgStmt.setString(5, rs.getString("password"));
                    pgStmt.setBoolean(6, rs.getBoolean("password_reset_allowed"));
                    pgStmt.setTimestamp(7, rs.getTimestamp("password_reset_granted_at"));
                    pgStmt.setString(8, rs.getString("role"));
                    pgStmt.setString(9, rs.getString("username"));
                    long managerId = rs.getLong("manager_id");
                    if (rs.wasNull()) {
                        pgStmt.setNull(10, java.sql.Types.BIGINT);
                    } else {
                        pgStmt.setLong(10, managerId);
                    }
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " users.");
            }

            // 3. Migrate tasks
            String selectTasks = "SELECT id, created_date, description, due_date, last_updated_date, on_hold_requested, priority, status, title, assigned_by_id, assigned_to_id FROM tasks ORDER BY id ASC";
            String insertTask = "INSERT INTO tasks (id, created_date, description, due_date, last_updated_date, on_hold_requested, priority, status, title, assigned_by_id, assigned_to_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectTasks);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertTask)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setTimestamp(2, rs.getTimestamp("created_date"));
                    pgStmt.setString(3, rs.getString("description"));
                    pgStmt.setTimestamp(4, rs.getTimestamp("due_date"));
                    pgStmt.setTimestamp(5, rs.getTimestamp("last_updated_date"));
                    pgStmt.setBoolean(6, rs.getBoolean("on_hold_requested"));
                    pgStmt.setString(7, rs.getString("priority"));
                    pgStmt.setString(8, rs.getString("status"));
                    pgStmt.setString(9, rs.getString("title"));
                    pgStmt.setLong(10, rs.getLong("assigned_by_id"));
                    pgStmt.setLong(11, rs.getLong("assigned_to_id"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " tasks.");
            }

            // 4. Migrate comments
            String selectComments = "SELECT id, author, content, created_date, task_id FROM comments ORDER BY id ASC";
            String insertComment = "INSERT INTO comments (id, author, content, created_date, task_id) VALUES (?, ?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectComments);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertComment)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setString(2, rs.getString("author"));
                    pgStmt.setString(3, rs.getString("content"));
                    pgStmt.setTimestamp(4, rs.getTimestamp("created_date"));
                    pgStmt.setLong(5, rs.getLong("task_id"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " comments.");
            }

            // 5. Migrate notifications
            String selectNotifications = "SELECT id, created_date, is_read, message, task_id, type, recipient_id, sender_id FROM notifications ORDER BY id ASC";
            String insertNotification = "INSERT INTO notifications (id, created_date, is_read, message, task_id, type, recipient_id, sender_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectNotifications);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertNotification)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setTimestamp(2, rs.getTimestamp("created_date"));
                    pgStmt.setBoolean(3, rs.getBoolean("is_read"));
                    pgStmt.setString(4, rs.getString("message"));
                    pgStmt.setLong(5, rs.getLong("task_id"));
                    pgStmt.setString(6, rs.getString("type"));
                    pgStmt.setLong(7, rs.getLong("recipient_id"));
                    pgStmt.setLong(8, rs.getLong("sender_id"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " notifications.");
            }

            // 6. Migrate audit_logs
            String selectAuditLogs = "SELECT id, action, details, performed_by, timestamp FROM audit_logs ORDER BY id ASC";
            String insertAuditLog = "INSERT INTO audit_logs (id, action, details, performed_by, timestamp) VALUES (?, ?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectAuditLogs);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertAuditLog)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setString(2, rs.getString("action"));
                    pgStmt.setString(3, rs.getString("details"));
                    pgStmt.setString(4, rs.getString("performed_by"));
                    pgStmt.setTimestamp(5, rs.getTimestamp("timestamp"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " audit_logs.");
            }

            // 7. Migrate password_reset_otps
            String selectOtps = "SELECT id, expiry_date, otp_code, username FROM password_reset_otps ORDER BY id ASC";
            String insertOtp = "INSERT INTO password_reset_otps (id, expiry_date, otp_code, username) VALUES (?, ?, ?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectOtps);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertOtp)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("id"));
                    pgStmt.setTimestamp(2, rs.getTimestamp("expiry_date"));
                    pgStmt.setString(3, rs.getString("otp_code"));
                    pgStmt.setString(4, rs.getString("username"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " password_reset_otps.");
            }

            // 8. Migrate user_pinned_tasks
            String selectPinned = "SELECT user_id, task_id FROM user_pinned_tasks";
            String insertPinned = "INSERT INTO user_pinned_tasks (user_id, task_id) VALUES (?, ?)";
            try (java.sql.PreparedStatement mysqlStmt = mysqlConn.prepareStatement(selectPinned);
                 ResultSet rs = mysqlStmt.executeQuery();
                 java.sql.PreparedStatement pgStmt = pgConn.prepareStatement(insertPinned)) {
                int count = 0;
                while (rs.next()) {
                    pgStmt.setLong(1, rs.getLong("user_id"));
                    pgStmt.setLong(2, rs.getLong("task_id"));
                    pgStmt.executeUpdate();
                    count++;
                }
                System.out.println("Migrated " + count + " user_pinned_tasks.");
            }

            // 9. Reset PG sequences
            String[] sequenceTables = {"users", "tasks", "comments", "notifications", "audit_logs", "password_reset_otps"};
            try (Statement pgStmt = pgConn.createStatement()) {
                for (String table : sequenceTables) {
                    try {
                        pgStmt.execute("SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), coalesce(max(id), 1)) FROM " + table);
                    } catch (Exception seqEx) {
                        System.out.println("Could not reset sequence for " + table + ": " + seqEx.getMessage());
                    }
                }
                System.out.println("PG serial sequences reset successfully.");
            }

            System.out.println("=== MIGRATION COMPLETED SUCCESSFULLY ===");
        }
    }
}