package com.todo.todowebapp.service;

import com.todo.todowebapp.model.*;
import com.todo.todowebapp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    public void updateOverdueTasks() {
        List<Task> pendingTasks = taskRepository.findAll().stream()
                .filter(t -> t.getStatus() == Status.PENDING || t.getStatus() == Status.IN_PROGRESS)
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(LocalDateTime.now()))
                .collect(Collectors.toList());
        for (Task task : pendingTasks) {
            task.setStatus(Status.OVERDUE);
            taskRepository.save(task);
            auditLogService.log("SYSTEM_OVERDUE", "SYSTEM", 
                    "Task ID " + task.getId() + " marked as OVERDUE due to passing deadline.");
        }
    }

    @Transactional
    public List<Task> getAllTasks() {
        updateOverdueTasks();
        return taskRepository.findAll();
    }

    @Transactional
    public Optional<Task> getTaskById(Long id) {
        updateOverdueTasks();
        return taskRepository.findById(id);
    }

    @Transactional
    public List<Task> getTasksAssignedTo(User user) {
        updateOverdueTasks();
        return taskRepository.findByAssignedTo(user);
    }

    @Transactional
    public List<Task> getTasksAssignedBy(User user) {
        updateOverdueTasks();
        return taskRepository.findByAssignedBy(user);
    }

    @Transactional
    public Task createTask(Task task, String creatorUsername) {
        Task savedTask = taskRepository.save(task);
        auditLogService.log("CREATE_TASK", creatorUsername, 
                "Created task '" + savedTask.getTitle() + "' (ID: " + savedTask.getId() + ") assigned to: " + savedTask.getAssignedTo().getUsername());
        return savedTask;
    }

    @Transactional
    public Task updateTask(Long taskId, Task updatedData, String modifierUsername) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        StringBuilder details = new StringBuilder("Updated fields for task ID " + taskId + ": ");
        boolean changed = false;

        if (updatedData.getTitle() != null && !updatedData.getTitle().equals(task.getTitle())) {
            details.append("Title (").append(task.getTitle()).append(" -> ").append(updatedData.getTitle()).append(") ");
            task.setTitle(updatedData.getTitle());
            changed = true;
        }
        if (updatedData.getDescription() != null && !updatedData.getDescription().equals(task.getDescription())) {
            details.append("Description changed ");
            task.setDescription(updatedData.getDescription());
            changed = true;
        }
        if (updatedData.getPriority() != null && updatedData.getPriority() != task.getPriority()) {
            details.append("Priority (").append(task.getPriority()).append(" -> ").append(updatedData.getPriority()).append(") ");
            task.setPriority(updatedData.getPriority());
            changed = true;
        }
        if (updatedData.getStatus() != null && updatedData.getStatus() != task.getStatus()) {
            details.append("Status (").append(task.getStatus()).append(" -> ").append(updatedData.getStatus()).append(") ");
            task.setStatus(updatedData.getStatus());
            changed = true;
        }
        if (updatedData.getDueDate() != null && !updatedData.getDueDate().equals(task.getDueDate())) {
            details.append("Due Date (").append(task.getDueDate()).append(" -> ").append(updatedData.getDueDate()).append(") ");
            task.setDueDate(updatedData.getDueDate());
            changed = true;
        }
        if (updatedData.getAssignedTo() != null && !updatedData.getAssignedTo().getId().equals(task.getAssignedTo().getId())) {
            details.append("Assigned To (").append(task.getAssignedTo().getUsername()).append(" -> ").append(updatedData.getAssignedTo().getUsername()).append(") ");
            task.setAssignedTo(updatedData.getAssignedTo());
            changed = true;
        }

        if (changed) {
            Task saved = taskRepository.save(task);
            auditLogService.log("UPDATE_TASK", modifierUsername, details.toString());
            return saved;
        }
        return task;
    }

    @Transactional
    public Task updateTaskStatus(Long taskId, Status newStatus, String modifierUsername) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        Status oldStatus = task.getStatus();
        task.setStatus(newStatus);
        Task saved = taskRepository.save(task);

        auditLogService.log("UPDATE_TASK_STATUS", modifierUsername, 
                "Updated task ID " + taskId + " status from " + oldStatus + " to " + newStatus);
        return saved;
    }

    @Transactional
    public void deleteTask(Long taskId, String modifierUsername) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        taskRepository.delete(task);
        auditLogService.log("DELETE_TASK", modifierUsername, 
                "Deleted task '" + task.getTitle() + "' (ID: " + taskId + ")");
    }

    @Transactional
    public Comment addComment(Long taskId, String content, String authorUsername) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        Comment comment = new Comment(content, authorUsername);
        task.addComment(comment);
        commentRepository.save(comment);

        auditLogService.log("ADD_COMMENT", authorUsername, 
                "Added comment to task ID " + taskId + ": \"" + (content.length() > 30 ? content.substring(0, 30) + "..." : content) + "\"");
        return comment;
    }

    @Transactional
    public void togglePinTask(Long taskId, String username, boolean pin) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        if (pin) {
            if (!user.getPinnedTasks().contains(task)) {
                user.getPinnedTasks().add(task);
            }
        } else {
            user.getPinnedTasks().remove(task);
        }
        userRepository.save(user);
    }

    public boolean isTaskPinnedByUser(Long taskId, String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return false;
        return user.getPinnedTasks().stream().anyMatch(t -> t.getId().equals(taskId));
    }

    @Transactional
    public Task requestHold(Long taskId, String username) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        task.setOnHoldRequested(true);
        Task saved = taskRepository.save(task);
        auditLogService.log("HOLD_REQUESTED", username, "Requested hold status for task ID " + taskId);
        return saved;
    }

    @Transactional
    public Task respondHold(Long taskId, boolean approved, String username) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        task.setOnHoldRequested(false);
        if (approved) {
            task.setStatus(Status.ON_HOLD);
        } else {
            task.setStatus(Status.IN_PROGRESS);
        }
        Task saved = taskRepository.save(task);
        auditLogService.log(approved ? "HOLD_REQUEST_ACCEPTED" : "HOLD_REQUEST_REJECTED", username, 
                "Responded to hold request for task ID " + taskId + " (Approved: " + approved + ")");
        return saved;
    }
}
