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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN')")
    public ResponseEntity<?> getAllEmployees(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<User> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            // GM can assign to anyone
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ROLE_MANAGER || u.getRole() == Role.ROLE_EMPLOYEE || u.getRole() == Role.ROLE_INTERN)
                    .collect(Collectors.toList());
        } else if (user.getRole() == Role.ROLE_MANAGER) {
            // Manager can assign to self, their employees, and interns in their team (direct or indirect)
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId()) || 
                                 (u.getRole() == Role.ROLE_EMPLOYEE && u.getManager() != null && u.getManager().getId().equals(user.getId())) ||
                                 (u.getRole() == Role.ROLE_INTERN && u.getManager() != null && 
                                  (u.getManager().getId().equals(user.getId()) || 
                                   (u.getManager().getManager() != null && u.getManager().getManager().getId().equals(user.getId())))))
                    .collect(Collectors.toList());
        } else if (user.getRole() == Role.ROLE_EMPLOYEE) {
            // Employee can assign to self and their interns
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId()) || 
                                 (u.getRole() == Role.ROLE_INTERN && u.getManager() != null && u.getManager().getId().equals(user.getId())))
                    .collect(Collectors.toList());
        } else {
            // Intern can assign to self only
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

    // List all users (for GM/Manager/Employee view)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<User> list;
        if (user.getRole() == Role.ROLE_ADMIN) {
            list = userService.getAllUsers();
        } else if (user.getRole() == Role.ROLE_MANAGER) {
            // Manager sees self, their employees, interns in team, and their GM
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId()) 
                            || (u.getRole() == Role.ROLE_EMPLOYEE && u.getManager() != null && u.getManager().getId().equals(user.getId()))
                            || (u.getRole() == Role.ROLE_INTERN && u.getManager() != null && 
                                (u.getManager().getId().equals(user.getId()) || 
                                 (u.getManager().getManager() != null && u.getManager().getManager().getId().equals(user.getId()))))
                            || (user.getManager() != null && u.getId().equals(user.getManager().getId())))
                    .collect(Collectors.toList());
        } else if (user.getRole() == Role.ROLE_EMPLOYEE) {
            // Employee sees self, their interns, and their manager
            list = userService.getAllUsers().stream()
                    .filter(u -> u.getId().equals(user.getId())
                            || (u.getRole() == Role.ROLE_INTERN && u.getManager() != null && u.getManager().getId().equals(user.getId()))
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
            if (userDto.getEmail() == null || userDto.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Error: Email is required.");
            }
            User newUser = new User(userDto.getUsername(), userDto.getPassword(), userDto.getRole());
            newUser.setEmail(userDto.getEmail().trim());
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
            } else if (userDto.getRole() == Role.ROLE_INTERN) {
                if (userDto.getManagerUsername() == null || userDto.getManagerUsername().trim().isEmpty()) {
                    return ResponseEntity.badRequest().body("Error: Intern must be assigned under an employee or manager.");
                }
                User manager = userService.findByUsername(userDto.getManagerUsername())
                        .orElseThrow(() -> new IllegalArgumentException("Manager/Employee not found"));
                if (manager.getRole() != Role.ROLE_EMPLOYEE && manager.getRole() != Role.ROLE_MANAGER) {
                    return ResponseEntity.badRequest().body("Error: Assigned manager must be an Employee or a Manager.");
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

            // Allow manager update for employees and interns
            if (existing.getRole() == Role.ROLE_EMPLOYEE) {
                if (userDto.getManagerUsername() != null && !userDto.getManagerUsername().trim().isEmpty()) {
                    User manager = userService.findByUsername(userDto.getManagerUsername())
                            .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
                     if (manager.getRole() != Role.ROLE_MANAGER) {
                          return ResponseEntity.badRequest().body("Error: Assigned user must be a Manager.");
                     }
                    existing.setManager(manager);
                }
            } else if (existing.getRole() == Role.ROLE_INTERN) {
                if (userDto.getManagerUsername() != null && !userDto.getManagerUsername().trim().isEmpty()) {
                    User manager = userService.findByUsername(userDto.getManagerUsername())
                            .orElseThrow(() -> new IllegalArgumentException("Assigned user not found"));
                     if (manager.getRole() != Role.ROLE_EMPLOYEE && manager.getRole() != Role.ROLE_MANAGER) {
                          return ResponseEntity.badRequest().body("Error: Assigned user must be an Employee or a Manager.");
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> managerCreateEmployee(@RequestBody UserDto userDto, Authentication authentication) {
        try {
            if (userDto.getEmail() == null || userDto.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Error: Email is required.");
            }
            User creator = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("Creator not found"));
            
            Role targetRole = userDto.getRole() != null ? userDto.getRole() : Role.ROLE_EMPLOYEE;
            
            if (creator.getRole() == Role.ROLE_EMPLOYEE) {
                targetRole = Role.ROLE_INTERN;
            } else if (creator.getRole() == Role.ROLE_MANAGER) {
                if (targetRole != Role.ROLE_EMPLOYEE && targetRole != Role.ROLE_INTERN) {
                    return ResponseEntity.badRequest().body("Error: Managers can only create Employees or Interns.");
                }
            }

            User newUser = new User(userDto.getUsername(), userDto.getPassword(), targetRole);
            newUser.setEmail(userDto.getEmail().trim());
            
            if (creator.getRole() == Role.ROLE_EMPLOYEE) {
                newUser.setManager(creator);
            } else if (creator.getRole() == Role.ROLE_MANAGER) {
                if (targetRole == Role.ROLE_EMPLOYEE) {
                    newUser.setManager(creator);
                } else {
                    if (userDto.getManagerUsername() != null && !userDto.getManagerUsername().trim().isEmpty()) {
                        User assignedManager = userService.findByUsername(userDto.getManagerUsername())
                                .orElseThrow(() -> new IllegalArgumentException("Assigned manager not found"));
                        if (assignedManager.getRole() != Role.ROLE_EMPLOYEE || assignedManager.getManager() == null || !assignedManager.getManager().getId().equals(creator.getId())) {
                            if (!assignedManager.getId().equals(creator.getId())) {
                                return ResponseEntity.badRequest().body("Error: Assigned manager must be you or one of your employees.");
                            }
                        }
                        newUser.setManager(assignedManager);
                    } else {
                        newUser.setManager(creator);
                    }
                }
            } else if (creator.getRole() == Role.ROLE_ADMIN) {
                if (userDto.getManagerUsername() != null && !userDto.getManagerUsername().trim().isEmpty()) {
                    User assignedManager = userService.findByUsername(userDto.getManagerUsername())
                            .orElseThrow(() -> new IllegalArgumentException("Assigned manager not found"));
                    newUser.setManager(assignedManager);
                }
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> managerUpdateEmployee(@PathVariable Long employeeId, @RequestBody UserDto userDto, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            User existing = userService.findById(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee/Intern not found"));

            if (user.getRole() == Role.ROLE_EMPLOYEE) {
                if (existing.getRole() != Role.ROLE_INTERN) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Employees can only edit Intern accounts.");
                }
                if (existing.getManager() == null || !existing.getManager().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only edit Interns assigned under you.");
                }
                if (userDto.getPassword() != null && !userDto.getPassword().trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Employees are not allowed to change intern passwords.");
                }
            } else if (user.getRole() == Role.ROLE_MANAGER) {
                if (existing.getRole() != Role.ROLE_EMPLOYEE && existing.getRole() != Role.ROLE_INTERN) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only edit Employee or Intern accounts.");
                }
                boolean isDirectReport = existing.getManager() != null && existing.getManager().getId().equals(user.getId());
                boolean isIndirectReport = existing.getManager() != null && existing.getManager().getManager() != null && existing.getManager().getManager().getId().equals(user.getId());
                if (!isDirectReport && !isIndirectReport) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only edit employees or interns in your team.");
                }
                if (userDto.getPassword() != null && !userDto.getPassword().trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers are not allowed to change employee/intern passwords.");
                }
            }

            User updated = userService.updateUser(existing, userDto.getUsername(), user.getRole() == Role.ROLE_ADMIN ? userDto.getPassword() : null, authentication.getName());
            return ResponseEntity.ok(new UserDto(updated.getId(), updated.getUsername(), updated.getRole(), updated.isPasswordResetAllowed()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/manager/toggle-reset-permission/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> managerTogglePermission(@PathVariable Long employeeId, @RequestParam boolean allowed, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            User existing = userService.findById(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee/Intern not found"));

            if (user.getRole() == Role.ROLE_EMPLOYEE) {
                if (existing.getRole() != Role.ROLE_INTERN) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Employees can only manage Intern permissions.");
                }
                if (existing.getManager() == null || !existing.getManager().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only manage Interns assigned under you.");
                }
            } else if (user.getRole() == Role.ROLE_MANAGER) {
                if (existing.getRole() != Role.ROLE_EMPLOYEE && existing.getRole() != Role.ROLE_INTERN) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only manage Employees or Interns.");
                }
                boolean isDirectReport = existing.getManager() != null && existing.getManager().getId().equals(user.getId());
                boolean isIndirectReport = existing.getManager() != null && existing.getManager().getManager() != null && existing.getManager().getManager().getId().equals(user.getId());
                if (!isDirectReport && !isIndirectReport) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only manage employees or interns in your team.");
                }
            }

            userService.setPasswordResetPermission(employeeId, allowed, authentication.getName());
            return ResponseEntity.ok("Password reset permission updated to " + allowed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
