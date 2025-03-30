
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MeetingNotesViewProps {
  notes: string | null;
  decisions: string[] | null;
  summary: string | null;
}

export function MeetingNotesView({ notes, decisions, summary }: MeetingNotesViewProps) {
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

      {/* Key Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {decisions && decisions.length > 0 ? (
            <ul className="list-disc pl-4 space-y-2">
              {decisions.map((decision, index) => (
                <li key={index}>{decision}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No decisions recorded for this meeting.</p>
          )}
        </CardContent>
      </Card>

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
