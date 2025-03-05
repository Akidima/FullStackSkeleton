import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flag,
  User,
} from "lucide-react";
import type { Task } from "@shared/schema";

interface TaskManagerProps {
  meetingId?: number;
  userId?: number;
}

export function TaskManager({ meetingId, userId }: TaskManagerProps) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("dueDate");
  const queryClient = useQueryClient();
  const RETRY_DELAY = 5000; // 5 seconds base delay
  const MAX_RETRY_DELAY = 60000; // 1 minute maximum delay
  const STALE_TIME = 30000; // Cache data for 30 seconds

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { meetingId, userId }],
    staleTime: STALE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(
      RETRY_DELAY * Math.pow(2, attemptIndex),
      MAX_RETRY_DELAY
    )
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task> & { id: number }) => {
      const response = await fetch(`/api/tasks/${updates.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Updated",
        description: "The task has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      const isRateLimit = error.message.includes('Rate limit exceeded');
      toast({
        title: "Error",
        description: isRateLimit 
          ? "Too many requests. Please wait a moment before trying again." 
          : "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
    retry: (failureCount, error: Error) => {
      // Don't retry on rate limit errors
      if (error.message.includes('Rate limit exceeded')) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(
      RETRY_DELAY * Math.pow(2, attemptIndex),
      MAX_RETRY_DELAY
    )
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Circle className="h-4 w-4 text-blue-500" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "pending") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    })
    .sort((a, b) => {
      if (sort === "dueDate") {
        // Handle null due dates by putting them at the end
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sort === "priority") {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (
          priorityWeight[b.priority as keyof typeof priorityWeight] -
          priorityWeight[a.priority as keyof typeof priorityWeight]
        );
      }
      if (sort === "status") {
        const statusWeight = { blocked: 3, in_progress: 2, pending: 1, completed: 0 };
        return (
          statusWeight[b.status as keyof typeof statusWeight] -
          statusWeight[a.status as keyof typeof statusWeight]
        );
      }
      return 0;
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>
              Track and manage meeting action items
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                    {task.assigneeId && (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        Assigned
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status}</span>
                    </div>
                    {task.dueDate && (
                      <span className="text-muted-foreground">
                        Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateTask.mutate({
                        id: task.id,
                        completed: !task.completed,
                        status: task.completed ? "pending" : "completed",
                        completedAt: task.completed ? null : new Date().toISOString()
                      })
                    }
                  >
                    {task.completed ? "Reopen" : "Complete"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredTasks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No action items found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}