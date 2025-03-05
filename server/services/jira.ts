import axios from 'axios';
import type { Task } from '@shared/schema';

interface JiraCredentials {
  domain: string;
  email: string;
  apiToken: string;
}

export class JiraService {
  static async createTask(task: Task, credentials: JiraCredentials): Promise<string> {
    try {
      const response = await axios.post(
        `https://${credentials.domain}.atlassian.net/rest/api/3/issue`,
        {
          fields: {
            project: { key: 'PROJECT_KEY' }, // This should come from user settings
            summary: task.title,
            description: task.description,
            issuetype: { name: 'Task' },
            duedate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
            assignee: task.assigneeId ? { id: task.assigneeId } : undefined
          }
        },
        {
          auth: {
            username: credentials.email,
            password: credentials.apiToken
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.key;
    } catch (error) {
      console.error('Error creating Jira task:', error);
      throw new Error('Failed to create Jira task');
    }
  }

  static async updateTask(taskKey: string, task: Task, credentials: JiraCredentials): Promise<void> {
    try {
      await axios.put(
        `https://${credentials.domain}.atlassian.net/rest/api/3/issue/${taskKey}`,
        {
          fields: {
            summary: task.title,
            description: task.description,
            duedate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
            assignee: task.assigneeId ? { id: task.assigneeId } : undefined
          }
        },
        {
          auth: {
            username: credentials.email,
            password: credentials.apiToken
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error updating Jira task:', error);
      throw new Error('Failed to update Jira task');
    }
  }

  static async deleteTask(taskKey: string, credentials: JiraCredentials): Promise<void> {
    try {
      await axios.delete(
        `https://${credentials.domain}.atlassian.net/rest/api/3/issue/${taskKey}`,
        {
          auth: {
            username: credentials.email,
            password: credentials.apiToken
          }
        }
      );
    } catch (error) {
      console.error('Error deleting Jira task:', error);
      throw new Error('Failed to delete Jira task');
    }
  }

  static async getTaskDetails(taskKey: string, credentials: JiraCredentials): Promise<any> {
    try {
      const response = await axios.get(
        `https://${credentials.domain}.atlassian.net/rest/api/3/issue/${taskKey}`,
        {
          auth: {
            username: credentials.email,
            password: credentials.apiToken
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting Jira task details:', error);
      throw new Error('Failed to get Jira task details');
    }
  }
}
