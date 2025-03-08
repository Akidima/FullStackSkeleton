import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Grip, X } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  position: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'meetings-stats',
    name: 'Meeting Statistics',
    description: 'View your meeting trends and analytics',
    enabled: true,
    position: 0
  },
  {
    id: 'participation',
    name: 'Participation Rate',
    description: 'Track meeting attendance and participation',
    enabled: true,
    position: 1
  },
  {
    id: 'room-utilization',
    name: 'Room Utilization',
    description: 'Monitor meeting room usage efficiency',
    enabled: true,
    position: 2
  },
  {
    id: 'ai-optimizer',
    name: 'AI Meeting Optimizer',
    description: 'Get AI-powered meeting optimization suggestions',
    enabled: true,
    position: 3
  },
  {
    id: 'productivity',
    name: 'Team Productivity',
    description: 'View team productivity roadmap and milestones',
    enabled: true,
    position: 4
  }
];

export function DashboardWidgetConfig() {
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/users/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/users/preferences');
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.widgets) {
        setWidgets(data.widgets);
      }
    }
  });

  const handleToggleWidget = async (id: string) => {
    const newWidgets = widgets.map(widget => 
      widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
    );
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));

    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgets: newWidgets
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast({
        title: 'Preferences saved',
        description: 'Your dashboard layout has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading preferences...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Dashboard Widgets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Grip className="h-5 w-5 text-muted-foreground cursor-move" />
                <div>
                  <h3 className="font-medium">{widget.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {widget.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={widget.enabled}
                onCheckedChange={() => handleToggleWidget(widget.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
