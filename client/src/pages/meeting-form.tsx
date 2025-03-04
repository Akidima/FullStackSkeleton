import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Room } from "@shared/schema";

export default function MeetingForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // Query for all rooms
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Query for available rooms based on selected time
  const { data: availableRooms = [], isLoading: isLoadingAvailable } = useQuery<Room[]>({
    queryKey: ["/api/rooms/available", selectedDate],
    queryFn: async () => {
      const endTime = new Date(selectedDate);
      endTime.setHours(endTime.getHours() + 1); // Default 1 hour duration

      const response = await fetch(
        `/api/rooms/available?startTime=${selectedDate}&endTime=${endTime.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch available rooms");
      return response.json();
    },
    enabled: !!selectedDate,
  });

  const form = useForm({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      title: "",
      date: new Date().toISOString().slice(0, 16),
      description: "",
      participants: [],
      agenda: "",
      notes: "",
      isCompleted: false,
      summary: "",
      userId: 1,
      roomId: undefined,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const formattedData = {
        ...data,
        date: new Date(data.date).toISOString(),
      };

      if (params.id) {
        await apiRequest("PATCH", `/api/meetings/${params.id}`, formattedData);
        toast({
          title: "Success",
          description: "Meeting updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/meetings", formattedData);
        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setLocation("/");
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              {params.id ? "Edit Meeting" : "Schedule New Meeting"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter meeting title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setSelectedDate(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Room</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingAvailable ? (
                            <SelectItem value="loading" disabled>
                              Loading available rooms...
                            </SelectItem>
                          ) : availableRooms.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No rooms available for selected time
                            </SelectItem>
                          ) : (
                            availableRooms.map((room) => (
                              <SelectItem key={room.id} value={room.id.toString()}>
                                {room.name} ({room.capacity} people)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter meeting description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participants</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter participants (comma separated)"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                .split(",")
                                .map((p) => p.trim())
                            )
                          }
                          value={field.value?.join(", ") || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agenda</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter meeting agenda"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  {params.id ? "Update Meeting" : "Schedule Meeting"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}