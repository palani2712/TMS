package com.todo.todowebapp.controller;

import com.todo.todowebapp.dto.UserDto;
import com.todo.todowebapp.model.Role;
import com.todo.todowebapp.model.User;
import com.todo.todowebapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    // Get current user profile
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(new UserDto(
                user.getId(), 
                user.getUsername(), 
                user.getRole(), 
                user.isPasswordResetAllowed(), 
                user.getFullName(), 
                user.getEmail(), 
                user.getContactNumber()
        ));
    }

    // Update user profile info
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UserDto profileDto, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            user.setFullName(profileDto.getFullName());
            user.setEmail(profileDto.getEmail());
            user.setContactNumber(profileDto.getContactNumber());
            
            userService.updateUserProfile(user, authentication.getName());
            
            return ResponseEntity.ok(new UserDto(
                    user.getId(), 
                    user.getUsername(), 
                    user.getRole(), 
                    user.isPasswordResetAllowed(), 
                    user.getFullName(), 
                    user.getEmail(), 
                    user.getContactNumber()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Change own password
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody UserDto passwordDto, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Rule: General Managers cannot change their password.
        if (user.getRole() == Role.ROLE_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: General Managers are not allowed to change their passwords.");
        }

        // Rule: Managers and Employees must have passwordResetAllowed = true.
        if (!user.isPasswordResetAllowed()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: You do not have permission to change your password. Please ask the General Manager.");
        }

        try {
            UserService.validatePassword(passwordDto.getPassword());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }

        userService.updateUser(user, null, passwordDto.getPassword(), authentication.getName());
        return ResponseEntity.ok("Password updated successfully.");
    }

    // List all assignable users depending on role
    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getAllEmployees(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<User> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            // Admin can assign to self, manager, and employee
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ROLE_MANAGER || u.getRole() == Role.ROLE_EMPLOYEE)
                    .collect(Collectors.toList());
        } else if (user.getRole() == Role.ROLE_MANAGER) {
            // Manager can assign to self and their own employees
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId()) || (u.getRole() == Role.ROLE_EMPLOYEE && u.getManager() != null && u.getManager().getId().equals(user.getId())))
                    .collect(Collectors.toList());
        } else {
            // Employee can assign to self only
            list = List.of(user);
        }

        List<UserDto> dtos = list.stream()
                .map(u -> {
                    UserDto dto = new UserDto(u.getId(), u.getUsername(), u.getRole(), u.isPasswordResetAllowed(), u.getFullName(), u.getEmail(), u.getContactNumber());
                    if (u.getManager() != null) {
                        dto.setManagerUsername(u.getManager().getUsername());
                    }
                    return dto;
                })
                .sorted((a, b) -> {
                    int roleCompare = a.getRole().compareTo(b.getRole());
                    if (roleCompare != 0) {
                        return roleCompare;
                    }
                    return a.getUsername().compareToIgnoreCase(b.getUsername());
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // List all users (for GM/Manager view)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<User> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            list = userService.getAllUsers();
        } else if (user.getRole() == Role.ROLE_MANAGER) {
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId()) 
                            || (u.getRole() == Role.ROLE_EMPLOYEE && u.getManager() != null && u.getManager().getId().equals(user.getId()))
                            || (user.getManager() != null && u.getId().equals(user.getManager().getId())))
                    .collect(Collectors.toList());
        } else {
            list = List.of(user);
        }

        List<UserDto> dtos = list.stream()
                .map(u -> {
                    UserDto dto = new UserDto(u.getId(), u.getUsername(), u.getRole(), u.isPasswordResetAllowed(), u.getFullName(), u.getEmail(), u.getContactNumber());
                    if (u.getManager() != null) {
                        dto.setManagerUsername(u.getManager().getUsername());
                    }
                    return dto;
                })
                .sorted((a, b) -> {
                    int roleCompare = a.getRole().compareTo(b.getRole());
                    if (roleCompare != 0) {
                        return roleCompare;
                    }
                    return a.getUsername().compareToIgnoreCase(b.getUsername());
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ==========================================
    // ADMIN (GENERAL MANAGER) ONLY ENDPOINTS
    // ==========================================

    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminCreateUser(@RequestBody UserDto userDto, Authentication authentication) {
        try {
            User newUser = new User(userDto.getUsername(), userDto.getPassword(), userDto.getRole());
            if (userDto.getRole() == Role.ROLE_EMPLOYEE) {
                if (userDto.getManagerUsername() == null || userDto.getManagerUsername().trim().isEmpty()) {
                    return ResponseEntity.badRequest().body("Error: Employee must be assigned under a manager.");
                }
                User manager = userService.findByUsername(userDto.getManagerUsername())
                        .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                if (manager.getRole() != Role.ROLE_MANAGER) {
                    return ResponseEntity.badRequest().body("Error: Assigned user must be a Manager.");
                }
                newUser.setManager(manager);
            }
            User saved = userService.createUser(newUser, authentication.getName());
            UserDto responseDto = new UserDto(saved.getId(), saved.getUsername(), saved.getRole(), saved.isPasswordResetAllowed());
            if (saved.getManager() != null) {
                responseDto.setManagerUsername(saved.getManager().getUsername());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/admin/update/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminUpdateUser(@PathVariable Long userId, @RequestBody UserDto userDto, Authentication authentication) {
        try {
            User existing = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            // Block role modification once assigned
            if (userDto.getRole() != null && userDto.getRole() != existing.getRole()) {
                return ResponseEntity.badRequest().body("Error: Changing user role is not allowed once assigned.");
            }

            // Allow manager update only for employees
            if (existing.getRole() == Role.ROLE_EMPLOYEE) {
                if (userDto.getManagerUsername() != null && !userDto.getManagerUsername().trim().isEmpty()) {
                    User manager = userService.findByUsername(userDto.getManagerUsername())
                            .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                     if (manager.getRole() != Role.ROLE_MANAGER) {
                         return ResponseEntity.badRequest().body("Error: Assigned user must be a Manager.");
                     }
                    existing.setManager(manager);
                }
            }
            User updated = userService.updateUser(existing, userDto.getUsername(), userDto.getPassword(), authentication.getName());
            UserDto responseDto = new UserDto(updated.getId(), updated.getUsername(), updated.getRole(), updated.isPasswordResetAllowed());
            if (updated.getManager() != null) {
                responseDto.setManagerUsername(updated.getManager().getUsername());
            }
            return ResponseEntity.ok(responseDto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/admin/delete/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminDeleteUser(@PathVariable Long userId, Authentication authentication) {
        try {
            userService.deleteUser(userId, authentication.getName());
            return ResponseEntity.ok("User deleted successfully.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/admin/toggle-reset-permission/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminTogglePermission(@PathVariable Long userId, @RequestParam boolean allowed, Authentication authentication) {
        try {
            userService.setPasswordResetPermission(userId, allowed, authentication.getName());
            return ResponseEntity.ok("Password reset permission updated to " + allowed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==========================================
    // MANAGER & ADMIN ENDPOINTS (EMPLOYEE MGMT)
    // ==========================================

    @PostMapping("/manager/create-employee")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> managerCreateEmployee(@RequestBody UserDto userDto, Authentication authentication) {
        try {
            User creator = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Creator not found"));
            User newUser = new User(userDto.getUsername(), userDto.getPassword(), Role.ROLE_EMPLOYEE);
            
            if (creator.getRole() == Role.ROLE_MANAGER) {
                newUser.setManager(creator);
            } else if (creator.getRole() == Role.ROLE_ADMIN) {
                if (userDto.getManagerUsername() == null || userDto.getManagerUsername().trim().isEmpty()) {
                    return ResponseEntity.badRequest().body("Error: Employee must be assigned under a manager.");
                }
                User manager = userService.findByUsername(userDto.getManagerUsername())
                        .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                newUser.setManager(manager);
            }
            
            User saved = userService.createUser(newUser, authentication.getName());
            UserDto responseDto = new UserDto(saved.getId(), saved.getUsername(), saved.getRole(), saved.isPasswordResetAllowed());
            if (saved.getManager() != null) {
                responseDto.setManagerUsername(saved.getManager().getUsername());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/manager/update-employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> managerUpdateEmployee(@PathVariable Long employeeId, @RequestBody UserDto userDto, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            User existing = userService.findById(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

            if (existing.getRole() != Role.ROLE_EMPLOYEE) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only edit Employee accounts.");
            }

            if (user.getRole() == Role.ROLE_MANAGER) {
                if (existing.getManager() == null || !existing.getManager().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only edit employees assigned under you.");
                }
                if (userDto.getPassword() != null && !userDto.getPassword().trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers are not allowed to change employee passwords.");
                }
            }

            // Update employee credentials (only General Manager can set new password here)
            User updated = userService.updateUser(existing, userDto.getUsername(), user.getRole() == Role.ROLE_ADMIN ? userDto.getPassword() : null, authentication.getName());
            return ResponseEntity.ok(new UserDto(updated.getId(), updated.getUsername(), updated.getRole(), updated.isPasswordResetAllowed()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/manager/toggle-reset-permission/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> managerTogglePermission(@PathVariable Long employeeId, @RequestParam boolean allowed, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            User existing = userService.findById(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

            if (existing.getRole() != Role.ROLE_EMPLOYEE) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only grant permissions to Employees.");
            }

            if (user.getRole() == Role.ROLE_MANAGER) {
                if (existing.getManager() == null || !existing.getManager().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only manage employees assigned under you.");
                }
            }

            userService.setPasswordResetPermission(employeeId, allowed, authentication.getName());
            return ResponseEntity.ok("Password reset permission updated to " + allowed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
