package com.todo.todowebapp.controller;

import com.todo.todowebapp.dto.CommentDto;
import com.todo.todowebapp.dto.TaskDto;
import com.todo.todowebapp.model.*;
import com.todo.todowebapp.service.TaskService;
import com.todo.todowebapp.service.UserService;
import com.todo.todowebapp.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    // Convert Task Entity to TaskDto
    private TaskDto convertToDto(Task task, String username) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setAssignedBy(task.getAssignedBy().getUsername());
        dto.setAssignedTo(task.getAssignedTo().getUsername());
        dto.setPriority(task.getPriority());
        dto.setStatus(task.getStatus());
        dto.setDueDate(task.getDueDate());
        dto.setCreatedDate(task.getCreatedDate());
        dto.setLastUpdatedDate(task.getLastUpdatedDate());
        dto.setPinned(taskService.isTaskPinnedByUser(task.getId(), username));
        dto.setOnHoldRequested(task.isOnHoldRequested());
        if (task.getComments() != null) {
            dto.setComments(task.getComments().stream()
                    .map(c -> new CommentDto(c.getId(), c.getContent(), c.getAuthor(), c.getCreatedDate()))
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    // List tasks depending on role
    @GetMapping
    public ResponseEntity<?> getTasks(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Task> tasks;
        if (user.getRole() == Role.ROLE_ADMIN) {
            // General Manager sees all tasks
            tasks = taskService.getAllTasks();
        } else if (user.getRole() == Role.ROLE_MANAGER) {
            // Managers see tasks assigned to/by themselves, or tasks assigned to their employees
            tasks = taskService.getAllTasks().stream()
                    .filter(t -> t.getAssignedTo().getId().equals(user.getId()) || 
                                 t.getAssignedBy().getId().equals(user.getId()) || 
                                 (t.getAssignedTo().getRole() == Role.ROLE_EMPLOYEE && 
                                  t.getAssignedTo().getManager() != null && 
                                  t.getAssignedTo().getManager().getId().equals(user.getId())))
                    .collect(Collectors.toList());
        } else {
            // Employees only see their own assigned tasks
            tasks = taskService.getTasksAssignedTo(user);
        }

        List<TaskDto> dtos = tasks.stream().map(t -> convertToDto(t, authentication.getName())).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // Get specific task details
    @GetMapping("/{taskId}")
    public ResponseEntity<?> getTaskById(@PathVariable Long taskId, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Task task = taskService.getTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        // Enforce employee access limit
        if (user.getRole() == Role.ROLE_EMPLOYEE && !task.getAssignedTo().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Access denied to this task.");
        }

        return ResponseEntity.ok(convertToDto(task, authentication.getName()));
    }

    // Create a new task (GMs, Managers, and Employees for themselves)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> createTask(@Valid @RequestBody TaskDto taskDto, Authentication authentication) {
        User creator = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("Creator not found"));

        User assignee = userService.findByUsername(taskDto.getAssignedTo())
                .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));

        // Creator and assignee validation based on rules:
        // - Admin can assign task to self, manager, and employee.
        // - Manager can assign task to self and employee.
        // - Employee can assign task to self only.
        if (creator.getRole() == Role.ROLE_EMPLOYEE) {
            if (!assignee.getUsername().equals(creator.getUsername())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Employees can only assign tasks to themselves.");
            }
        } else if (creator.getRole() == Role.ROLE_MANAGER) {
            boolean isSelf = assignee.getId().equals(creator.getId());
            boolean isEmployeeInTeam = assignee.getRole() == Role.ROLE_EMPLOYEE 
                    && assignee.getManager() != null 
                    && assignee.getManager().getId().equals(creator.getId());
            if (!isSelf && !isEmployeeInTeam) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only assign tasks to themselves or employees in their team.");
            }
        } else if (creator.getRole() == Role.ROLE_ADMIN) {
            if (assignee.getRole() != Role.ROLE_ADMIN && assignee.getRole() != Role.ROLE_MANAGER && assignee.getRole() != Role.ROLE_EMPLOYEE) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: GMs can only assign tasks to GMs, Managers, or Employees.");
            }
        }

        Task task = new Task();
        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription());
        task.setAssignedBy(creator);
        task.setAssignedTo(assignee);
        task.setPriority(taskDto.getPriority() != null ? taskDto.getPriority() : Priority.MEDIUM);
        task.setStatus(Status.PENDING);
        task.setDueDate(taskDto.getDueDate());

        Task saved = taskService.createTask(task, authentication.getName());

        // Notify the assignee if they are not the creator
        if (!assignee.getId().equals(creator.getId())) {
            String senderName = (creator.getFullName() != null && !creator.getFullName().trim().isEmpty())
                    ? creator.getFullName() : creator.getUsername();
            String msg = senderName + " assigned you a new task: '" + saved.getTitle() + "'.";
            notificationService.createNotification(assignee, creator, msg, saved.getId(), "TASK_ASSIGNED");
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(saved, authentication.getName()));
    }

    // Update task details (Creator only)
    @PutMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> updateTask(@PathVariable Long taskId, @RequestBody TaskDto taskDto, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Task taskToUpdate = taskService.getTaskById(taskId)
                    .orElseThrow(() -> new IllegalArgumentException("Task not found"));

            // Enforce creator-only edit limit
            boolean isAuthorized = taskToUpdate.getAssignedBy().getId().equals(user.getId());
            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task can modify it.");
            }

            if (taskDto.getStatus() != null && taskDto.getStatus() != taskToUpdate.getStatus()) {
                boolean isAssignee = taskToUpdate.getAssignedTo().getId().equals(user.getId());
                boolean isCreator = taskToUpdate.getAssignedBy().getId().equals(user.getId());
                boolean isAdmin = user.getRole() == Role.ROLE_ADMIN;
                Status newStatus = taskDto.getStatus();

                if (newStatus == Status.ON_HOLD) {
                    if (!isCreator && !isAdmin) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task or the General Manager can change the status to On-Hold.");
                    }
                } else {
                    if (taskToUpdate.getStatus() == Status.COMPLETED && (newStatus == Status.PENDING || newStatus == Status.IN_PROGRESS)) {
                        if (!isCreator && !isAdmin) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task or the General Manager can reopen it.");
                        }
                    } else if (taskToUpdate.getStatus() == Status.ON_HOLD && newStatus == Status.IN_PROGRESS) {
                        if (!isCreator && !isAdmin && !isAssignee) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the assignee, creator, or General Manager can resume an On-Hold task.");
                        }
                    } else {
                        if (!isAssignee) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the assigned user can change the status of this task.");
                        }
                    }
                }

                Status currentStatus = taskToUpdate.getStatus();
                if (newStatus == Status.ON_HOLD) {
                    if (currentStatus == Status.COMPLETED) {
                        return ResponseEntity.badRequest().body("Error: Completed tasks cannot be changed to On-Hold.");
                    }
                    if (currentStatus != Status.PENDING && currentStatus != Status.IN_PROGRESS && currentStatus != Status.OVERDUE) {
                        return ResponseEntity.badRequest().body("Error: Only pending, in-progress, or overdue tasks can be changed to On-Hold.");
                    }
                }
                if (currentStatus == Status.ON_HOLD && newStatus != Status.ON_HOLD && newStatus != Status.IN_PROGRESS) {
                    return ResponseEntity.badRequest().body("Error: On-Hold tasks can only be changed to In Progress.");
                }
                if (currentStatus == Status.COMPLETED && newStatus != Status.COMPLETED) {
                    if ((newStatus == Status.PENDING || newStatus == Status.IN_PROGRESS) && (isCreator || isAdmin)) {
                        // Allow reopening
                    } else {
                        return ResponseEntity.badRequest().body("Error: Completed tasks cannot have their status changed.");
                    }
                }
                if (currentStatus == Status.IN_PROGRESS && newStatus == Status.PENDING) {
                    return ResponseEntity.badRequest().body("Error: Tasks in progress cannot be changed back to pending.");
                }
            }

            Task updatedData = new Task();
            updatedData.setTitle(taskDto.getTitle());
            updatedData.setDescription(taskDto.getDescription());
            updatedData.setPriority(taskDto.getPriority());
            updatedData.setStatus(taskDto.getStatus());
            updatedData.setDueDate(taskDto.getDueDate());

            if (taskDto.getAssignedTo() != null) {
                User assignee = userService.findByUsername(taskDto.getAssignedTo())
                        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));

                // Validate if the modifier (user) can assign task to assignee
                if (user.getRole() == Role.ROLE_EMPLOYEE) {
                    if (!assignee.getUsername().equals(user.getUsername())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Employees can only assign tasks to themselves.");
                    }
                } else if (user.getRole() == Role.ROLE_MANAGER) {
                    boolean isSelf = assignee.getId().equals(user.getId());
                    boolean isEmployeeInTeam = assignee.getRole() == Role.ROLE_EMPLOYEE 
                            && assignee.getManager() != null 
                            && assignee.getManager().getId().equals(user.getId());
                    if (!isSelf && !isEmployeeInTeam) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Managers can only assign tasks to themselves or employees in their team.");
                    }
                } else if (user.getRole() == Role.ROLE_ADMIN) {
                    if (assignee.getRole() != Role.ROLE_ADMIN && assignee.getRole() != Role.ROLE_MANAGER && assignee.getRole() != Role.ROLE_EMPLOYEE) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: GMs can only assign tasks to GMs, Managers, or Employees.");
                    }
                }
                updatedData.setAssignedTo(assignee);
            }

            // Capture previous assignee before update to detect reassignment
            User previousAssignee = taskToUpdate.getAssignedTo();

            Task task = taskService.updateTask(taskId, updatedData, authentication.getName());

            // Notify new assignee if they differ from the previous one and are not the creator
            if (updatedData.getAssignedTo() != null
                    && !updatedData.getAssignedTo().getId().equals(previousAssignee.getId())
                    && !updatedData.getAssignedTo().getId().equals(user.getId())) {
                String senderName = (user.getFullName() != null && !user.getFullName().trim().isEmpty())
                        ? user.getFullName() : user.getUsername();
                String msg = senderName + " reassigned the task '" + task.getTitle() + "' to you.";
                notificationService.createNotification(updatedData.getAssignedTo(), user, msg, task.getId(), "TASK_ASSIGNED");
            }

            return ResponseEntity.ok(convertToDto(task, authentication.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Patch status (All roles, only the assigned user can modify the status)
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(@PathVariable Long taskId, @RequestParam Status status, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Task task = taskService.getTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        boolean isAssignee = task.getAssignedTo().getId().equals(user.getId());
        boolean isCreator = task.getAssignedBy().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ROLE_ADMIN;

        if (status == Status.ON_HOLD) {
            if (!isCreator && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task or the General Manager can change the status to On-Hold.");
            }
        } else {
            if (task.getStatus() == Status.COMPLETED && (status == Status.PENDING || status == Status.IN_PROGRESS)) {
                if (!isCreator && !isAdmin) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task or the General Manager can reopen it.");
                }
            } else if (task.getStatus() == Status.ON_HOLD && status == Status.IN_PROGRESS) {
                if (!isCreator && !isAdmin && !isAssignee) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the assignee, creator, or General Manager can resume an On-Hold task.");
                }
            } else {
                if (!isAssignee) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the assigned user can change the status of this task.");
                }
            }
        }

        Status currentStatus = task.getStatus();
        if (status == Status.ON_HOLD) {
            if (currentStatus == Status.COMPLETED) {
                return ResponseEntity.badRequest().body("Error: Completed tasks cannot be changed to On-Hold.");
            }
            if (currentStatus != Status.PENDING && currentStatus != Status.IN_PROGRESS && currentStatus != Status.OVERDUE) {
                return ResponseEntity.badRequest().body("Error: Only pending, in-progress, or overdue tasks can be changed to On-Hold.");
            }
        }
        if (currentStatus == Status.ON_HOLD && status != Status.ON_HOLD && status != Status.IN_PROGRESS) {
            return ResponseEntity.badRequest().body("Error: On-Hold tasks can only be changed to In Progress.");
        }
        if (currentStatus == Status.COMPLETED && status != Status.COMPLETED) {
            if ((status == Status.PENDING || status == Status.IN_PROGRESS) && (isCreator || isAdmin)) {
                // Allow reopening
            } else {
                return ResponseEntity.badRequest().body("Error: Completed tasks cannot have their status changed.");
            }
        }
        if (currentStatus == Status.IN_PROGRESS && status == Status.PENDING) {
            return ResponseEntity.badRequest().body("Error: Tasks in progress cannot be changed back to pending.");
        }

        Task updated = taskService.updateTaskStatus(taskId, status, authentication.getName());
        return ResponseEntity.ok(convertToDto(updated, authentication.getName()));
    }

    // Toggle pin status of a task for the current user
    @PutMapping("/{taskId}/pin")
    public ResponseEntity<?> togglePinTask(@PathVariable Long taskId, @RequestParam boolean pinned, Authentication authentication) {
        try {
            taskService.togglePinTask(taskId, authentication.getName(), pinned);
            return ResponseEntity.ok("Task pinned status updated successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Add comments (All roles, employees can only comment on their own tasks)
    @PostMapping("/{taskId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long taskId, @RequestBody CommentDto commentDto, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Task task = taskService.getTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (user.getRole() == Role.ROLE_EMPLOYEE && !task.getAssignedTo().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: You can only comment on tasks assigned to you.");
        }

        if (commentDto.getContent() == null || commentDto.getContent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Comment content cannot be empty.");
        }

        Comment comment = taskService.addComment(taskId, commentDto.getContent(), authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(new CommentDto(comment.getId(), comment.getContent(), comment.getAuthor(), comment.getCreatedDate()));
    }

    // Delete task (GMs and Managers, or the creator of the task)
    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Task task = taskService.getTaskById(taskId)
                    .orElseThrow(() -> new IllegalArgumentException("Task not found"));

            boolean isAuthorized = task.getAssignedBy().getId().equals(user.getId());

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task can delete it.");
            }

            taskService.deleteTask(taskId, authentication.getName());
            return ResponseEntity.ok("Task deleted successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{taskId}/request-hold")
    public ResponseEntity<?> requestHold(@PathVariable Long taskId, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Task task = taskService.getTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        boolean isAssignee = task.getAssignedTo().getId().equals(user.getId());
        boolean isManagerOfAssignee = task.getAssignedTo().getManager() != null 
                && task.getAssignedTo().getManager().getId().equals(user.getId());
        boolean isAssigneeManager = task.getAssignedTo().getRole() == Role.ROLE_MANAGER;

        boolean allowed = isAssignee || (isManagerOfAssignee && !isAssigneeManager);

        if (!allowed) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the assigned user or their manager can request to put this task On-Hold.");
        }

        if (task.getStatus() == Status.COMPLETED || task.getStatus() == Status.ON_HOLD) {
            return ResponseEntity.badRequest().body("Error: Tasks already Completed or On-Hold cannot request hold.");
        }

        if (task.isOnHoldRequested()) {
            return ResponseEntity.badRequest().body("Error: A hold request is already pending for this task.");
        }

        Task updated = taskService.requestHold(taskId, authentication.getName());
        String senderName = (user.getFullName() != null && !user.getFullName().trim().isEmpty()) ? user.getFullName() : user.getUsername();
        String msg = senderName + " requested to put the task '" + task.getTitle() + "' On-Hold.";
        notificationService.createNotification(task.getAssignedBy(), user, msg, task.getId(), "HOLD_REQUEST");
        return ResponseEntity.ok(convertToDto(updated, authentication.getName()));
    }

    @PostMapping("/{taskId}/respond-hold")
    public ResponseEntity<?> respondHold(@PathVariable Long taskId, @RequestParam boolean approved, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Task task = taskService.getTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (!task.getAssignedBy().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Only the creator who assigned this task can approve or reject hold requests.");
        }

        if (!task.isOnHoldRequested()) {
            return ResponseEntity.badRequest().body("Error: No hold request is currently pending for this task.");
        }

        Task updated = taskService.respondHold(taskId, approved, authentication.getName());
        String statusText = approved ? "approved" : "rejected";
        String typeText = approved ? "HOLD_APPROVED" : "HOLD_REJECTED";
        String senderName = (user.getFullName() != null && !user.getFullName().trim().isEmpty()) ? user.getFullName() : user.getUsername();
        String msg = "Your hold request for task '" + task.getTitle() + "' has been " + statusText + " by " + senderName + ".";
        notificationService.createNotification(task.getAssignedTo(), user, msg, task.getId(), typeText);
        return ResponseEntity.ok(convertToDto(updated, authentication.getName()));
    }
}
