package com.todo.todowebapp.component;

import com.todo.todowebapp.model.*;
import com.todo.todowebapp.repository.UserRepository;
import com.todo.todowebapp.service.TaskService;
import com.todo.todowebapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDateTime;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private TaskService taskService;

    @Override
    public void run(String... args) throws Exception {
        // Programmatically ensure the many-to-many join table exists
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS user_pinned_tasks (" +
                "user_id BIGINT NOT NULL, " +
                "task_id BIGINT NOT NULL, " +
                "PRIMARY KEY (user_id, task_id), " +
                "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, " +
                "FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE" +
                ")");

        // Migrate existing admin to generalmanager if present
        userRepository.findByUsername("admin").ifPresent(u -> {
            userService.updateUser(u, "generalmanager", "generalmanager123", "SYSTEM");
        });

        // Seed Users
        if (userRepository.count() == 0) {
            User admin = new User("generalmanager", "generalmanager123", Role.ROLE_ADMIN);
            userService.createUser(admin, "SYSTEM");

            User manager = new User("manager", "manager123", Role.ROLE_MANAGER);
            userService.createUser(manager, "SYSTEM");

            User employee = new User("employee", "employee123", Role.ROLE_EMPLOYEE);
            employee.setManager(manager);
            userService.createUser(employee, "SYSTEM");

            // Seed Sample Tasks
            User seedAdmin = userRepository.findByUsername("generalmanager").get();
            User seedManager = userRepository.findByUsername("manager").get();
            User seedEmployee = userRepository.findByUsername("employee").get();

            // Task 1: Complete Q2 Report
            Task task1 = new Task();
            task1.setTitle("Complete Q2 Financial Analysis");
            task1.setDescription("Compile the financial projections and performance analysis for the second quarter.");
            task1.setAssignedBy(seedManager);
            task1.setAssignedTo(seedEmployee);
            task1.setPriority(Priority.HIGH);
            task1.setStatus(Status.IN_PROGRESS);
            task1.setDueDate(LocalDateTime.now().plusDays(3));
            taskService.createTask(task1, "SYSTEM");

            // Task 2: Setup Developer Environment
            Task task2 = new Task();
            task2.setTitle("Verify Environment Setup");
            task2.setDescription("Confirm the Java 25 development tools and database properties are fully operational.");
            task2.setAssignedBy(seedAdmin);
            task2.setAssignedTo(seedEmployee);
            task2.setPriority(Priority.MEDIUM);
            task2.setStatus(Status.PENDING);
            task2.setDueDate(LocalDateTime.now().plusDays(1));
            taskService.createTask(task2, "SYSTEM");

            // Add a comment to task 1
            taskService.addComment(1L, "Working on compiling the spreadsheet database.", "employee");

            // Task 3: Design Main Dashboard Mockup
            Task task3 = new Task();
            task3.setTitle("Review Dashboard Interface Layout");
            task3.setDescription("Create visual mockups and draft styling guidelines for the premium sidebar and statistics screen.");
            task3.setAssignedBy(seedManager);
            task3.setAssignedTo(seedEmployee);
            task3.setPriority(Priority.LOW);
            task3.setStatus(Status.COMPLETED);
            task3.setDueDate(LocalDateTime.now().minusDays(1));
            taskService.createTask(task3, "SYSTEM");
        }
    }
}
