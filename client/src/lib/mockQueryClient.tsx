import { QueryClient } from '@tanstack/react-query';
import { mockMeetings, mockTasks, mockNotes, mockUser } from './mockData';

// Create a queryClient instance that will be used in development
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false, // Don't retry failed queries in mock mode
    },
  },
});

// Mock API endpoints based on URL patterns
const mockApiData: Record<string, any> = {
  '/api/meetings': mockMeetings,
  '/api/tasks': mockTasks, 
  '/api/meetings/notes': mockNotes,
  '/api/user': mockUser,
  '/api/user/profile': mockUser,
};

// Initialize the mock data in the queryClient cache
export function initializeMockData() {
  console.log('Initializing mock data in query cache');
  
  // Pre-populate the query cache with our mock data
  Object.entries(mockApiData).forEach(([key, value]) => {
    queryClient.setQueryData([key], value);
  });
  
  // Also set individual meeting data
  mockMeetings.forEach(meeting => {
    queryClient.setQueryData(['/api/meetings', meeting.id.toString()], meeting);
  });
  
  // Also set individual task data
  mockTasks.forEach(task => {
    queryClient.setQueryData(['/api/tasks', task.id.toString()], task);
  });
}

// Mock API request function
export async function apiRequest<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  console.log(`Mock API request: ${method} ${url}`, data);
  
  // Add artificial delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Handle GET requests
  if (method === 'GET') {
    // Check if this is an individual entity request (e.g., /api/meetings/1)
    const meetingIdMatch = url.match(/\/api\/meetings\/(\d+)$/);
    if (meetingIdMatch) {
      const id = parseInt(meetingIdMatch[1], 10);
      const meeting = mockMeetings.find(m => m.id === id);
      if (meeting) return meeting as unknown as T;
      throw new Error('Meeting not found');
    }
    
    const taskIdMatch = url.match(/\/api\/tasks\/(\d+)$/);
    if (taskIdMatch) {
      const id = parseInt(taskIdMatch[1], 10);
      const task = mockTasks.find(t => t.id === id);
      if (task) return task as unknown as T;
      throw new Error('Task not found');
    }
    
    // For collection endpoints
    if (url in mockApiData) {
      return mockApiData[url] as T;
    }
  }
  
  // Handle POST requests (create)
  if (method === 'POST') {
    if (url === '/api/meetings') {
      const newMeeting = {
        id: Math.max(...mockMeetings.map(m => m.id)) + 1,
        ...data,
        isCompleted: false,
        summary: null,
      };
      mockMeetings.push(newMeeting);
      return newMeeting as unknown as T;
    }
    
    if (url === '/api/tasks') {
      const newTask = {
        id: Math.max(...mockTasks.map(t => t.id)) + 1,
        ...data,
        progress: data.progress || 0,
        completed: data.completed || false,
      };
      mockTasks.push(newTask);
      return newTask as unknown as T;
    }
  }
  
  // Handle PATCH requests (update)
  if (method === 'PATCH') {
    const meetingIdMatch = url.match(/\/api\/meetings\/(\d+)$/);
    if (meetingIdMatch) {
      const id = parseInt(meetingIdMatch[1], 10);
      const meetingIndex = mockMeetings.findIndex(m => m.id === id);
      if (meetingIndex >= 0) {
        mockMeetings[meetingIndex] = { ...mockMeetings[meetingIndex], ...data };
        return mockMeetings[meetingIndex] as unknown as T;
      }
      throw new Error('Meeting not found');
    }
    
    const taskIdMatch = url.match(/\/api\/tasks\/(\d+)$/);
    if (taskIdMatch) {
      const id = parseInt(taskIdMatch[1], 10);
      const taskIndex = mockTasks.findIndex(t => t.id === id);
      if (taskIndex >= 0) {
        mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...data };
        return mockTasks[taskIndex] as unknown as T;
      }
      throw new Error('Task not found');
    }
  }
  
  // Handle DELETE requests
  if (method === 'DELETE') {
    const meetingIdMatch = url.match(/\/api\/meetings\/(\d+)$/);
    if (meetingIdMatch) {
      const id = parseInt(meetingIdMatch[1], 10);
      const meetingIndex = mockMeetings.findIndex(m => m.id === id);
      if (meetingIndex >= 0) {
        const deletedMeeting = mockMeetings[meetingIndex];
        mockMeetings.splice(meetingIndex, 1);
        return { success: true, id } as unknown as T;
      }
      throw new Error('Meeting not found');
    }
    
    const taskIdMatch = url.match(/\/api\/tasks\/(\d+)$/);
    if (taskIdMatch) {
      const id = parseInt(taskIdMatch[1], 10);
      const taskIndex = mockTasks.findIndex(t => t.id === id);
      if (taskIndex >= 0) {
        mockTasks.splice(taskIndex, 1);
        return { success: true, id } as unknown as T;
      }
      throw new Error('Task not found');
    }
  }
  
  // If we get here, the endpoint is not implemented in our mock
  console.warn(`Mock API endpoint not implemented: ${method} ${url}`);
  throw new Error(`Endpoint not implemented in mock: ${method} ${url}`);
}