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
      date: new Date().toISOString(),
      description: "",
      participants: [],
      agenda: "",
      notes: "",
      isCompleted: false,
      summary: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (params.id) {
        await apiRequest("PATCH", `/api/meetings/${params.id}`, data);
        toast({
          title: "Success",
          description: "Meeting updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/meetings", data);
        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save meeting",
        variant: "destructive",
      });
    }
  };

  const generateSummary = async () => {
    if (!params.id) return;

    try {
      setIsSummarizing(true);
      await apiRequest("POST", `/api/meetings/${params.id}/summarize`);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Success",
        description: "Meeting summary generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate meeting summary",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
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
                        <Input type="datetime-local" {...field} />
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
                {params.id && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={generateSummary}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                )}
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