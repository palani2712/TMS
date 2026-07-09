package com.todo.todowebapp.dto;

import com.todo.todowebapp.model.Role;

public class UserDto {
    private Long id;
    private String username;
    private Role role;
    private boolean passwordResetAllowed;
    private String password; // used for creation/password change
    private String fullName;
    private String email;
    private String contactNumber;
    private String managerUsername;

    public UserDto() {}

    public UserDto(Long id, String username, Role role, boolean passwordResetAllowed) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.passwordResetAllowed = passwordResetAllowed;
    }

    public UserDto(Long id, String username, Role role, boolean passwordResetAllowed, String fullName, String email, String contactNumber) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.passwordResetAllowed = passwordResetAllowed;
        this.fullName = fullName;
        this.email = email;
        this.contactNumber = contactNumber;
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

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isPasswordResetAllowed() {
        return passwordResetAllowed;
    }

    public void setPasswordResetAllowed(boolean passwordResetAllowed) {
        this.passwordResetAllowed = passwordResetAllowed;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

    public String getManagerUsername() {
        return managerUsername;
    }

    public void setManagerUsername(String managerUsername) {
        this.managerUsername = managerUsername;
    }
}
