package com.todo.todowebapp.repository;

import com.todo.todowebapp.model.Notification;
import com.todo.todowebapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedDateDesc(User recipient);
}
