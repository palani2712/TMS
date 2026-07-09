package com.todo.todowebapp.controller;

import com.todo.todowebapp.dto.NotificationDto;
import com.todo.todowebapp.model.Notification;
import com.todo.todowebapp.model.User;
import com.todo.todowebapp.service.NotificationService;
import com.todo.todowebapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<?> getNotifications(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Notification> list = notificationService.getNotificationsForUser(user);
        List<NotificationDto> dtos = list.stream()
                .map(n -> new NotificationDto(
                        n.getId(),
                        n.getRecipient().getUsername(),
                        n.getSender().getUsername(),
                        n.getMessage(),
                        n.getTaskId(),
                        n.getType(),
                        n.isRead(),
                        n.getCreatedDate()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication authentication) {
        try {
            notificationService.markAsRead(id, authentication.getName());
            return ResponseEntity.ok("Notification marked as read");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication authentication) {
        try {
            notificationService.deleteNotification(id, authentication.getName());
            return ResponseEntity.ok("Notification cleared");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
