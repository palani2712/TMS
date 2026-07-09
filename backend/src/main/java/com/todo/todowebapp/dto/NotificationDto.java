package com.todo.todowebapp.dto;

import java.time.LocalDateTime;

public class NotificationDto {
    private Long id;
    private String recipient;
    private String sender;
    private String message;
    private Long taskId;
    private String type;
    private boolean read;
    private LocalDateTime createdDate;

    public NotificationDto() {}

    public NotificationDto(Long id, String recipient, String sender, String message, Long taskId, String type, boolean read, LocalDateTime createdDate) {
        this.id = id;
        this.recipient = recipient;
        this.sender = sender;
        this.message = message;
        this.taskId = taskId;
        this.type = type;
        this.read = read;
        this.createdDate = createdDate;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}
