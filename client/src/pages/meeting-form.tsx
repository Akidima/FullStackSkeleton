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

export default function MeetingForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const [isSummarizing, setIsSummarizing] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      title: "",
      date: new Date().toISOString().slice(0, 16), // Format for datetime-local input
      description: "",
      participants: [],
      agenda: "",
      notes: "",
      isCompleted: false,
      summary: "",
      userId: 1, // Set the demo user ID
    },
  });

  const onSubmit = async (data: any) => {
    try {
      // Convert the date string to a Date object before sending
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
                          }}
                        />
                      </FormControl>
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