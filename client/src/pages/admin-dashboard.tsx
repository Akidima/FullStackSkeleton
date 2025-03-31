import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { RegistrationAttempt, VoiceCommand } from "@shared/schema";
import { useMockWebSocket } from "@/hooks/mock-websocket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Activity, AlertCircle, AlertTriangle, Mic, Headphones } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<"none" | "ip" | "email">("none");
  const [filterValue, setFilterValue] = useState("");
  const [activeTab, setActiveTab] = useState<"registrations" | "voice" | "calendar">("registrations");
  const [voiceCommands, setVoiceCommands] = useState<Array<{
    id: string;
    userId: number;
    timestamp: string;
    command: {
      understood: boolean;
      commandType: string;
      processedCommand: string;
      params: Record<string, any>;
      userFeedback: string;
      confidence: number;
      alternativeInterpretations?: string[];
    }
  }>>([]);
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string;
    userId: number;
    meetingId: number;
    provider: string;
    action: string;
    timestamp: string;
    status: string;
    details?: string;
  }>>([]);
  const { isConnected, connectionState, send } = useMockWebSocket();
  const queryClient = useQueryClient();

  // Set up WebSocket listener to refresh data when new registration attempts occur
  useEffect(() => {
    if (connectionState === 'connected') {
      console.log('Admin dashboard connected to WebSocket');
      
      // Only show toast when transitioning from disconnected to connected
      // to avoid showing on initial page load
      if (connectionState === 'connected') {
        toast({
          title: "Real-time updates enabled",
          description: "You'll see new registration attempts instantly",
          variant: "default"
        });
      }
      
      // Set up an interval to check WebSocket connection status
      const intervalId = setInterval(() => {
        fetch('/api/websocket/status')
          .then(res => res.json())
          .then(data => {
            if (data.status === 'active') {
              // WebSocket server is running correctly
              console.log('WebSocket server is active:', data);
            } else {
              console.warn('WebSocket server status check failed:', data);
            }
          })
          .catch(err => {
            console.error('Error checking WebSocket status:', err);
          });
      }, 60000); // Check every minute
      
      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    } else if (connectionState === 'error') {
      toast({
        title: "Connection error",
        description: "Real-time updates are currently unavailable",
        variant: "destructive"
      });
    }
  }, [connectionState, toast]);
  
  // Add effect to listen for "registration" and "voice" events from WebSocket
  useEffect(() => {
    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'registration:attempt') {
          console.log('Registration attempt received via WebSocket:', data);
          // Refresh the data
          queryClient.invalidateQueries({ 
            queryKey: ["/api/admin/registration-attempts"] 
          });
          
          // Show a notification
          toast({
            title: "New registration attempt",
            description: `${data.email || 'Unknown'} from ${data.ipAddress || 'Unknown IP'}`,
            variant: data.status === 'blocked' ? "destructive" : "default"
          });
        }
        
        if (data.type === 'system:status') {
          console.log('System status update received:', data);
          
          // Show appropriate notification based on status
          if (data.status) {
            toast({
              title: `System Status: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
              description: data.details || "Status update received",
              variant: data.status === 'healthy' ? "default" : "destructive"
            });
          }
        }
        
        if (data.type === 'voice:command') {
          console.log('Voice command received via WebSocket:', data);
          
          // Add to voice commands list
          setVoiceCommands(prev => {
            // Generate a unique ID if not provided
            const commandId = data.id || `voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Add new command at the beginning of the array
            return [{
              id: commandId,
              userId: data.userId || 0,
              timestamp: data.timestamp || new Date().toISOString(),
              command: data.command
            }, ...prev.slice(0, 99)]; // Keep only the latest 100 commands
          });
          
          // Show notification if on voice tab or high priority command
          if (activeTab === 'voice' || (data.command && !data.command.understood)) {
            toast({
              title: `Voice Command ${data.command.understood ? 'Processed' : 'Failed'}`,
              description: data.command.userFeedback || 'Voice command processed',
              variant: data.command.understood ? "default" : "destructive",
              duration: data.command.understood ? 3000 : 5000 // Show longer for errors
            });
          }
        }
        
        // Handle calendar events
        if (data.type === 'calendar:sync' || data.type === 'calendar:update' || data.type === 'calendar:delete') {
          console.log('Calendar event received via WebSocket:', data);
          
          // Add to calendar events list
          setCalendarEvents(prev => {
            // Generate a unique ID if not provided
            const eventId = data.id || `calendar-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Add new event at the beginning of the array
            return [{
              id: eventId,
              userId: data.userId || 0,
              meetingId: data.meetingId || 0,
              provider: data.provider || 'unknown',
              action: data.type.split(':')[1] || 'sync',
              timestamp: data.timestamp || new Date().toISOString(),
              status: data.status || 'success',
              details: data.details || ''
            }, ...prev.slice(0, 99)]; // Keep only the latest 100 events
          });
          
          // Show notification if on calendar tab
          if (activeTab === 'calendar') {
            toast({
              title: `Calendar Event ${data.type.split(':')[1].charAt(0).toUpperCase() + data.type.split(':')[1].slice(1)}`,
              description: `Meeting #${data.meetingId} via ${data.provider} calendar`,
              variant: "default",
              duration: 3000
            });
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };
    
    // Add global event listener for WebSocket messages
    window.addEventListener('websocket-message', handleSocketMessage as EventListener);
    
    return () => {
      // Clean up listener on unmount
      window.removeEventListener('websocket-message', handleSocketMessage as EventListener);
    };
  }, [queryClient, toast, activeTab]);

  const { data: attempts, isLoading, error } = useQuery<RegistrationAttempt[]>({
    queryKey: [
      "/api/admin/registration-attempts",
      filterType,
      filterValue,
    ],
    queryFn: async () => {
      let url = "/api/admin/registration-attempts";

      if (filterValue && filterType !== "none") {
        url += `/${filterType}/${encodeURIComponent(filterValue)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
  });

  if (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to fetch data",
      variant: "destructive",
    });
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registration Attempts Dashboard</h1>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              <span>Live updates</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              <span>Offline mode</span>
            </Badge>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "registrations" | "voice" | "calendar")} className="mb-6">
        <TabsList>
          <TabsTrigger value="registrations">Registration Attempts</TabsTrigger>
          <TabsTrigger value="voice">Voice Commands</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Events</TabsTrigger>
        </TabsList>
      </Tabs>

      {isConnected && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-3">WebSocket Testing</h3>
          <div className="flex flex-wrap gap-3">
            {activeTab === "registrations" && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Use the mock websocket directly
                    send({
                      type: 'registration:test',
                      data: {
                        email: 'test@example.com',
                        ipAddress: '192.168.1.1',
                        status: 'success',
                        userAgent: 'Mozilla/5.0 (Test WebSocket)',
                      }
                    });
                    console.log('Registration attempt test sent via mock websocket');
                  }}
                >
                  <Activity className="h-4 w-4" />
                  <span>Test Registration (Success)</span>
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Use the mock websocket directly for blocked registration
                    send({
                      type: 'registration:test',
                      data: {
                        email: 'blocked@example.com',
                        ipAddress: '10.0.0.1',
                        status: 'blocked',
                        reason: 'Suspicious activity',
                        userAgent: 'Mozilla/5.0 (Test WebSocket - Blocked)',
                      }
                    });
                    console.log('Blocked registration attempt test sent via mock websocket');
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Test Registration (Blocked)</span>
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Use the mock websocket directly for system status
                    send({
                      type: 'system:test',
                      data: {
                        status: 'degraded',
                        details: 'High database load detected',
                      }
                    });
                    console.log('System status test sent via mock websocket');
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Test System Status</span>
                </Button>
              </>
            )}
            
            {activeTab === "voice" && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Test a successful voice command
                    send({
                      type: 'voice:command',
                      userId: 1,
                      timestamp: new Date().toISOString(),
                      command: {
                        understood: true,
                        commandType: 'navigate',
                        processedCommand: 'Show my dashboard',
                        params: { destination: 'dashboard' },
                        userFeedback: 'Navigating to your dashboard',
                        confidence: 0.98,
                        alternativeInterpretations: ['Show my meetings']
                      }
                    });
                    console.log('Test voice command sent via mock websocket');
                  }}
                >
                  <Mic className="h-4 w-4" />
                  <span>Test Voice Command (Success)</span>
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Test a failed voice command
                    send({
                      type: 'voice:command',
                      userId: 1,
                      timestamp: new Date().toISOString(),
                      command: {
                        understood: false,
                        commandType: 'unknown',
                        processedCommand: '',
                        params: {},
                        userFeedback: 'I couldn\'t understand that command. Could you please try again?',
                        confidence: 0.45,
                        alternativeInterpretations: []
                      }
                    });
                    console.log('Test voice command (failed) sent via mock websocket');
                  }}
                >
                  <Headphones className="h-4 w-4" />
                  <span>Test Voice Command (Failed)</span>
                </Button>
              </>
            )}
            {activeTab === "calendar" && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Test a calendar sync event
                    send({
                      type: 'calendar:sync',
                      userId: 1,
                      meetingId: 123,
                      provider: 'google',
                      timestamp: new Date().toISOString(),
                      status: 'success'
                    });
                    console.log('Test calendar sync event sent via mock websocket');
                  }}
                >
                  <Activity className="h-4 w-4" />
                  <span>Test Calendar Sync</span>
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    // Test a calendar update event
                    send({
                      type: 'calendar:update',
                      userId: 1,
                      meetingId: 456,
                      provider: 'outlook',
                      timestamp: new Date().toISOString(),
                      status: 'success'
                    });
                    console.log('Test calendar update event sent via mock websocket');
                  }}
                >
                  <Activity className="h-4 w-4" />
                  <span>Test Calendar Update</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "registrations" && (
        <>
          <div className="flex gap-4 mb-6">
            <Select
              value={filterType}
              onValueChange={(value: "none" | "ip" | "email") => {
                setFilterType(value);
                setFilterValue("");
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Filter</SelectItem>
                <SelectItem value="ip">IP Address</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>

            {filterType !== "none" && (
              <Input
                placeholder={`Enter ${filterType === "ip" ? "IP address" : "email"}`}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-[300px]"
              />
            )}
          </div>

          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Attempt Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts?.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{attempt.email}</TableCell>
                      <TableCell>{attempt.ipAddress}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            attempt.status === "success"
                              ? "bg-green-100 text-green-800"
                              : attempt.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {attempt.status}
                        </span>
                      </TableCell>
                      <TableCell>{attempt.reason || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={attempt.userAgent || ""}>
                        {attempt.userAgent || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(attempt.attemptTime), "PPpp")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!attempts || attempts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No registration attempts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      
      {activeTab === "voice" && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Command Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Processed Command</TableHead>
                <TableHead>Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voiceCommands.map((cmd) => (
                <TableRow key={cmd.id}>
                  <TableCell>{format(new Date(cmd.timestamp), "PPp")}</TableCell>
                  <TableCell>{cmd.userId}</TableCell>
                  <TableCell>{cmd.command.commandType}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cmd.command.understood
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {cmd.command.understood ? "Understood" : "Failed"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cmd.command.confidence >= 0.95
                          ? "bg-green-100 text-green-800"
                          : cmd.command.confidence >= 0.7
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {(cmd.command.confidence * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={cmd.command.processedCommand}>
                    {cmd.command.processedCommand || "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={cmd.command.userFeedback}>
                    {cmd.command.userFeedback}
                  </TableCell>
                </TableRow>
              ))}
              {voiceCommands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No voice commands recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {activeTab === "calendar" && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Meeting ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendarEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{format(new Date(event.timestamp), "PPp")}</TableCell>
                  <TableCell>{event.userId}</TableCell>
                  <TableCell>{event.meetingId}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.provider === "google"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {event.provider.charAt(0).toUpperCase() + event.provider.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.action === "sync"
                          ? "bg-green-100 text-green-800"
                          : event.action === "update"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {event.action.charAt(0).toUpperCase() + event.action.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.status === "success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={event.details}>
                    {event.details || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {calendarEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No calendar events recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}