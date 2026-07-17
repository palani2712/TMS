package com.todo.todowebapp.service;

import com.todo.todowebapp.model.User;
import com.todo.todowebapp.model.Task;
import com.todo.todowebapp.repository.UserRepository;
import com.todo.todowebapp.repository.TaskRepository;
import com.todo.todowebapp.repository.CommentRepository;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class UserService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    @Lazy
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogService auditLogService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole().name()))
        );
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public boolean isTaskPinnedByUser(Long taskId, String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return false;
        return user.getPinnedTasks().stream().anyMatch(t -> t.getId().equals(taskId));
    }

    @Transactional
    public User updateUserProfile(User user, String modifierUsername) {
        User saved = userRepository.save(user);
        auditLogService.log("UPDATE_PROFILE", modifierUsername, 
                "Updated profile details for: " + saved.getUsername());
        return saved;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public static void validatePassword(String password) {
        if (password == null || password.trim().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        boolean hasLetter = password.matches(".*[a-zA-Z].*");
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\",./<>?\\\\|`~].*");
        if (!hasLetter || !hasDigit || !hasSpecial) {
            throw new IllegalArgumentException("Password must contain letters, numbers, and special characters.");
        }
    }

    @Transactional
    public User createUser(User user, String creatorUsername) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Username is already taken!");
        }
        if (!"SYSTEM".equals(creatorUsername)) {
            validatePassword(user.getPassword());
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        auditLogService.log("CREATE_USER", creatorUsername, 
                "Created user: " + savedUser.getUsername() + " with role: " + savedUser.getRole());
        return savedUser;
    }

    @Transactional
    public User updateUser(User existingUser, String newUsername, String newPassword, String modifierUsername) {
        if (newUsername != null && !newUsername.trim().isEmpty() && !newUsername.equals(existingUser.getUsername())) {
            if (!"SYSTEM".equals(modifierUsername)) {
                User modifier = userRepository.findByUsername(modifierUsername).orElse(null);
                if (modifier == null || modifier.getRole() != com.todo.todowebapp.model.Role.ROLE_ADMIN) {
                    throw new IllegalArgumentException("Only the General Manager can change usernames.");
                }
            }
            if (userRepository.existsByUsername(newUsername)) {
                throw new IllegalArgumentException("Username is already taken!");
            }
            String oldUsername = existingUser.getUsername();
            existingUser.setUsername(newUsername);
            auditLogService.log("UPDATE_USERNAME", modifierUsername, 
                    "Updated username for: " + oldUsername + " to " + newUsername);
        }

        if (newPassword != null && !newPassword.trim().isEmpty()) {
            if (!"SYSTEM".equals(modifierUsername)) {
                validatePassword(newPassword);
            }
            existingUser.setPassword(passwordEncoder.encode(newPassword));
            existingUser.setPasswordResetAllowed(false);
            existingUser.setPasswordResetGrantedAt(null);
            auditLogService.log("UPDATE_PASSWORD", modifierUsername, 
                    "Updated password for: " + existingUser.getUsername());
        }

        return userRepository.save(existingUser);
    }

    @Transactional
    public void deleteUser(Long id, String modifierUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Block deletion of manager if they have employees assigned under them
        if (user.getRole() == com.todo.todowebapp.model.Role.ROLE_MANAGER) {
            long employeeCount = userRepository.findAll().stream()
                    .filter(u -> u.getManager() != null && u.getManager().getId().equals(id))
                    .count();
            if (employeeCount > 0) {
                throw new IllegalArgumentException("Cannot delete manager. There are employees assigned to this manager. Please reassign them to another manager first.");
            }
        }

        // Set manager to null for any users managed by this user (fallback/general safety)
        List<User> managedUsers = userRepository.findAll().stream()
                .filter(u -> u.getManager() != null && u.getManager().getId().equals(id))
                .collect(Collectors.toList());
        for (User managed : managedUsers) {
            managed.setManager(null);
            userRepository.save(managed);
        }
        userRepository.flush();

        // 2. Delete tasks assigned to or assigned by this user
        List<Task> tasksToDelete = taskRepository.findAll().stream()
                .filter(t -> t.getAssignedTo().getId().equals(id) || t.getAssignedBy().getId().equals(id))
                .collect(Collectors.toList());

        // Remove these tasks from all users' pinned list first to avoid constraint violation
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            boolean changed = u.getPinnedTasks().removeIf(pinnedTask -> 
                tasksToDelete.stream().anyMatch(t -> t.getId().equals(pinnedTask.getId()))
            );
            if (changed) {
                userRepository.save(u);
            }
        }
        userRepository.flush(); // Force many-to-many join table deletions first

        // Delete all comments of these tasks first
        for (Task t : tasksToDelete) {
            if (t.getComments() != null) {
                commentRepository.deleteAll(t.getComments());
            }
        }
        commentRepository.flush();

        taskRepository.deleteAll(tasksToDelete);
        taskRepository.flush(); // Force database to delete tasks first

        // 3. Delete the user
        userRepository.delete(user);
        auditLogService.log("DELETE_USER", modifierUsername, "Deleted user: " + user.getUsername());
    }

    @Transactional
    public void setPasswordResetPermission(Long userId, boolean allowed, String modifierUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setPasswordResetAllowed(allowed);
        if (allowed) {
            user.setPasswordResetGrantedAt(java.time.LocalDateTime.now());
        } else {
            user.setPasswordResetGrantedAt(null);
        }
        userRepository.save(user);
        auditLogService.log("PERMISSION_CHANGE", modifierUsername, 
                (allowed ? "Granted" : "Revoked") + " password reset permission for user: " + user.getUsername());
    }
}
