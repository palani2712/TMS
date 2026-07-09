package com.todo.todowebapp.repository;

import com.todo.todowebapp.model.Task;
import com.todo.todowebapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedTo(User user);
    List<Task> findByAssignedBy(User user);
    List<Task> findByAssignedToUsername(String username);
}
