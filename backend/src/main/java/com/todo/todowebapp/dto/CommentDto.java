package com.todo.todowebapp.dto;

import java.time.LocalDateTime;

public class CommentDto {
    private Long id;
    private String content;
    private String author;
    private LocalDateTime createdDate;

    public CommentDto() {}

    public CommentDto(Long id, String content, String author, LocalDateTime createdDate) {
        this.id = id;
        this.content = content;
        this.author = author;
        this.createdDate = createdDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
}
