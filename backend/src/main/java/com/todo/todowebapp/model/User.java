package com.todo.todowebapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 50)
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank
    @Size(min = 6, max = 120)
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "password_reset_allowed", nullable = false)
    private boolean passwordResetAllowed = false;

    @Column(name = "password_reset_granted_at")
    private java.time.LocalDateTime passwordResetGrantedAt;

    @Column(name = "full_name")
    private String fullName;

    @NotBlank
    @jakarta.validation.constraints.Email
    @Column(nullable = false)
    private String email;

    @Column(name = "contact_number")
    private String contactNumber;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_pinned_tasks",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "task_id")
    )
    private List<Task> pinnedTasks = new ArrayList<>();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "manager_id")
    private User manager;

    public User() {
    }

    public User(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.passwordResetAllowed = false;
        this.passwordResetGrantedAt = null;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isPasswordResetAllowed() {
        if (passwordResetAllowed && passwordResetGrantedAt != null) {
            return java.time.LocalDateTime.now().isBefore(passwordResetGrantedAt.plusMinutes(5));
        }
        return passwordResetAllowed;
    }

    public void setPasswordResetAllowed(boolean passwordResetAllowed) {
        this.passwordResetAllowed = passwordResetAllowed;
    }

    public java.time.LocalDateTime getPasswordResetGrantedAt() {
        return passwordResetGrantedAt;
    }

    public void setPasswordResetGrantedAt(java.time.LocalDateTime passwordResetGrantedAt) {
        this.passwordResetGrantedAt = passwordResetGrantedAt;
    }

    public List<Task> getPinnedTasks() {
        return pinnedTasks;
    }

    public void setPinnedTasks(List<Task> pinnedTasks) {
        this.pinnedTasks = pinnedTasks;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    public User getManager() {
        return manager;
    }

    public void setManager(User manager) {
        this.manager = manager;
    }
}
