import { useQuery } from "@tanstack/react-query";
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
import { useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { RegistrationAttempt } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<"none" | "ip" | "email">("none");
  const [filterValue, setFilterValue] = useState("");

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
      <h1 className="text-2xl font-bold mb-6">Registration Attempts Dashboard</h1>

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