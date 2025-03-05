import axios from 'axios';
import type { Task } from '@shared/schema';

const ASANA_API_URL = 'https://app.asana.com/api/1.0';

export class AsanaService {
  static async createTask(task: Task, accessToken: string): Promise<string> {
    try {
      const response = await axios.post(
        `${ASANA_API_URL}/tasks`,
        {
          data: {
            name: task.title,
            notes: task.description,
            due_on: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
            assignee: task.assigneeId ? `${task.assigneeId}` : undefined,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.gid;
    } catch (error) {
      console.error('Error creating Asana task:', error);
      throw new Error('Failed to create Asana task');
    }
  }

  static async updateTask(taskId: string, task: Task, accessToken: string): Promise<void> {
    try {
      await axios.put(
        `${ASANA_API_URL}/tasks/${taskId}`,
        {
          data: {
            name: task.title,
            notes: task.description,
            due_on: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
            assignee: task.assigneeId ? `${task.assigneeId}` : undefined,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error updating Asana task:', error);
      throw new Error('Failed to update Asana task');
    }
  }

  static async deleteTask(taskId: string, accessToken: string): Promise<void> {
    try {
      await axios.delete(`${ASANA_API_URL}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.error('Error deleting Asana task:', error);
      throw new Error('Failed to delete Asana task');
    }
  }

  static async getTaskDetails(taskId: string, accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${ASANA_API_URL}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Error getting Asana task details:', error);
      throw new Error('Failed to get Asana task details');
    }
  }
}
