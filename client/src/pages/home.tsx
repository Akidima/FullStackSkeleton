import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Task } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { data: tasks, isLoading } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"]
  });

  const toggleTask = async (taskId: number, completed: boolean) => {
    await apiRequest("PATCH", `/api/tasks/${taskId}`, { completed });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <ListTodo className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Task Manager</h1>
          </div>
          <Link href="/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks?.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between">
                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                      {task.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTask(task.id, !task.completed)}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{task.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
