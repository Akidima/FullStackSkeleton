import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const task = await storage.getTask(Number(req.params.id));
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(Number(req.params.id), taskData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const success = await storage.deleteTask(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(204).send();
  });

  return createServer(app);
}
