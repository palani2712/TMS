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
    }
}
