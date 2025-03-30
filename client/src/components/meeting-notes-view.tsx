
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MeetingNotesViewProps {
  notes: string | null;
  decisions?: string[] | null; // Made optional since it's not in the Meeting type
  summary: string | null;
}

export function MeetingNotesView({ notes, decisions, summary }: MeetingNotesViewProps) {
  // Extract decisions from summary if available and decisions not provided
  const extractedDecisions = !decisions && summary ? 
    extractDecisionsFromSummary(summary) : null;
  
  const decisionsToDisplay = decisions || extractedDecisions;
  
  return (
    <div className="space-y-4">
      {/* Meeting Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes ? (
            <div className="whitespace-pre-wrap">{notes}</div>
          ) : (
            <p className="text-muted-foreground">No notes recorded for this meeting.</p>
          )}
        </CardContent>
      </Card>

      {/* Key Decisions - only shown if decisions are available */}
      {decisionsToDisplay && decisionsToDisplay.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 space-y-2">
              {decisionsToDisplay.map((decision, index) => (
                <li key={index}>{decision}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Meeting Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to extract decisions from summary text
function extractDecisionsFromSummary(summary: string): string[] {
  // Look for common patterns that indicate decisions in the summary text
  const decisionsSection = summary.match(/decisions?:([^]*)(?:action items:|summary:|$)/i);
  
  if (decisionsSection && decisionsSection[1]) {
    // Split by bullet points, numbers, or other common separators
    return decisionsSection[1]
      .split(/(?:\r?\n|\r)(?:[-•*]|\d+\.\s)/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  
  return [];
}
