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
import type { RegistrationAttempt } from "@shared/schema";
import { useMockWebSocket } from "@/hooks/mock-websocket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Activity, AlertCircle, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<"none" | "ip" | "email">("none");
  const [filterValue, setFilterValue] = useState("");
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
  
  // Add effect to listen for "registration" events from WebSocket
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
  }, [queryClient, toast]);

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

      {isConnected && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-3">WebSocket Testing</h3>
          <div className="flex flex-wrap gap-3">
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
          </div>
        </div>
      )}
      
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
    </div>
  );
}