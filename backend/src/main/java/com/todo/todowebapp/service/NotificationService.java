package com.todo.todowebapp.service;

import com.todo.todowebapp.model.Notification;
import com.todo.todowebapp.model.User;
import com.todo.todowebapp.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(User recipient, User sender, String message, Long taskId, String type) {
        Notification notification = new Notification(recipient, sender, message, taskId, type);
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(User user) {
        return notificationRepository.findByRecipientOrderByCreatedDateDesc(user);
    }

    @Transactional
    public void markAsRead(Long notificationId, String username) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getRecipient().getUsername().equals(username)) {
            throw new IllegalArgumentException("Unauthorized to modify this notification");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void deleteNotification(Long notificationId, String username) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getRecipient().getUsername().equals(username)) {
            throw new IllegalArgumentException("Unauthorized to delete this notification");
        }
        notificationRepository.delete(notification);
    }
}
