import { format, addDays, subDays } from 'date-fns';

// Helper function to generate dates relative to now
const relativeDate = (daysOffset: number) => {
  return new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString();
};

// Mock meetings data
export const mockMeetings = [
  {
    id: 1,
    title: "Weekly Product Review",
    description: "Reviewing product progress and planning next sprint",
    date: relativeDate(2), // 2 days from now
    participants: ["alex@example.com", "sarah@example.com", "john@example.com"],
    agenda: "1. Review last sprint\n2. Demo new features\n3. Plan next sprint\n4. Assign tasks",
    notes: "Team agreed to focus on voice accessibility features for the next sprint.",
    isCompleted: false,
    summary: null,
    userId: 1,
    roomId: 1
  },
  {
    id: 2,
    title: "Design System Workshop",
    description: "Establishing design system guidelines for the application",
    date: relativeDate(-1), // Yesterday
    participants: ["design@example.com", "dev@example.com", "pm@example.com"],
    agenda: "1. Current design audit\n2. Component hierarchy\n3. Color system\n4. Typography",
    notes: "Established primary and secondary color palette. Typography will use system fonts.",
    isCompleted: true,
    summary: "Design system foundations were established, with focus on accessibility.",
    userId: 1,
    roomId: 2
  },
  {
    id: 3,
    title: "Q2 Planning Session",
    description: "Planning our objectives and key results for Q2",
    date: relativeDate(5), // 5 days from now
    participants: ["leadership@example.com", "team@example.com"],
    agenda: "1. Review Q1 results\n2. Market trends\n3. Set Q2 OKRs\n4. Resource allocation",
    notes: null,
    isCompleted: false,
    summary: null,
    userId: 1,
    roomId: 3
  },
  {
    id: 4,
    title: "Accessibility Review",
    description: "Reviewing our application for accessibility compliance",
    date: relativeDate(1), // Tomorrow
    participants: ["a11y@example.com", "dev@example.com", "qa@example.com"],
    agenda: "1. WCAG 2.1 compliance\n2. Screen reader compatibility\n3. Keyboard navigation\n4. Color contrast",
    notes: null,
    isCompleted: false,
    summary: null,
    userId: 1,
    roomId: 1
  },
  {
    id: 5,
    title: "Voice Assistant Implementation",
    description: "Technical discussion on integrating voice commands",
    date: relativeDate(3), // 3 days from now
    participants: ["speech@example.com", "ai@example.com", "frontend@example.com"],
    agenda: "1. Voice recognition libraries\n2. Command patterns\n3. Fallback mechanisms\n4. Multilingual support",
    notes: null,
    isCompleted: false,
    summary: null,
    userId: 1,
    roomId: 4
  },
  {
    id: 6,
    title: "User Testing Session",
    description: "Testing the new voice assistant feature with real users",
    date: relativeDate(7), // 7 days from now
    participants: ["users@example.com", "ux@example.com", "pm@example.com"],
    agenda: "1. Testing protocol\n2. User scenarios\n3. Data collection\n4. Feedback analysis",
    notes: null,
    isCompleted: false,
    summary: null,
    userId: 1,
    roomId: 2
  }
];

// Mock tasks data
export const mockTasks = [
  {
    id: 1,
    title: "Implement voice command detection",
    description: "Create the core voice recognition system using TensorFlow.js",
    status: "completed",
    priority: "high",
    progress: 100,
    completed: true,
    dueDate: relativeDate(-2) // 2 days ago
  },
  {
    id: 2,
    title: "Add multi-language support",
    description: "Extend voice command system to support 10 languages",
    status: "completed",
    priority: "high",
    progress: 100,
    completed: true,
    dueDate: relativeDate(0) // Today
  },
  {
    id: 3,
    title: "Create voice feedback system",
    description: "Implement audio responses for voice commands using browser speech synthesis",
    status: "in_progress",
    priority: "medium",
    progress: 60,
    completed: false,
    dueDate: relativeDate(2) // 2 days from now
  },
  {
    id: 4,
    title: "Implement high-contrast mode",
    description: "Add a high-contrast visual theme for users with visual impairments",
    status: "pending",
    priority: "medium",
    progress: 0,
    completed: false,
    dueDate: relativeDate(5) // 5 days from now
  },
  {
    id: 5,
    title: "Screen reader compatibility testing",
    description: "Test the application with popular screen readers (NVDA, JAWS, VoiceOver)",
    status: "pending",
    priority: "high",
    progress: 0,
    completed: false,
    dueDate: relativeDate(7) // 7 days from now
  },
  {
    id: 6,
    title: "Claude AI integration",
    description: "Connect to Claude AI through Anthropic API for enhanced voice understanding",
    status: "in_progress",
    priority: "high",
    progress: 40,
    completed: false,
    dueDate: relativeDate(3) // 3 days from now
  },
  {
    id: 7,
    title: "Fix WebSocket connection issues",
    description: "Investigate and resolve WebSocket connection failures in certain environments",
    status: "blocked",
    priority: "high",
    progress: 10,
    completed: false,
    dueDate: relativeDate(1) // Tomorrow
  }
];

// Mock notes data
export const mockNotes = [
  {
    id: 1,
    meetingTitle: "Weekly Product Review",
    content: "The team discussed voice assistant implementation challenges. Sarah suggested using TensorFlow.js for the client-side speech recognition to reduce latency.",
    createdAt: subDays(new Date(), 5).toISOString()
  },
  {
    id: 2,
    meetingTitle: "Design System Workshop",
    content: "We decided to implement a high-contrast mode and increase default font sizes for better accessibility. All interactive elements must be keyboard navigable.",
    createdAt: subDays(new Date(), 2).toISOString()
  },
  {
    id: 3,
    meetingTitle: "Accessibility Planning",
    content: "WCAG 2.1 AA compliance is our minimum target. We'll implement screen reader announcements for dynamic content changes and ensure proper ARIA attributes.",
    createdAt: subDays(new Date(), 1).toISOString()
  },
  {
    id: 4,
    meetingTitle: "Voice Assistant Implementation",
    content: "We'll support 10 languages at launch: English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, and Russian. Each requires custom command detection.",
    createdAt: new Date().toISOString()
  }
];

// Mock user data
export const mockUser = {
  id: 1,
  name: "Demo User",
  email: "demo@example.com",
  role: "admin",
  avatarUrl: null,
  settings: {
    theme: "light",
    notifications: true,
    language: "en"
  }
};