import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Clock,
  Users,
  BarChart,
  Zap,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-8">
              Intelligent Meeting Management{" "}
              <span className="text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
              Transform your meetings with AI-powered insights, mood tracking, and
              effortless scheduling. Experience the future of collaborative work.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <Link href="/meetings">
                  <Button size="lg" className="gap-2">
                    Go to Dashboard <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg">Get Started Free</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need for Better Meetings
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features to make every meeting count
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description:
                  "Drag-and-drop scheduling with AI-powered time suggestions and conflict resolution.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Real-time participant management, shared agendas, and collaborative note-taking.",
              },
              {
                icon: BarChart,
                title: "Mood Analytics",
                description:
                  "Track meeting sentiment and engagement with our advanced AI analysis.",
              },
              {
                icon: Zap,
                title: "Instant Insights",
                description:
                  "Get real-time recommendations and insights during your meetings.",
              },
              {
                icon: Clock,
                title: "Time Optimization",
                description:
                  "Automatic duration suggestions based on agenda and participant preferences.",
              },
              {
                icon: CheckCircle,
                title: "Meeting Success Tracking",
                description:
                  "Measure and improve meeting effectiveness with detailed analytics.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-background p-6 rounded-lg border hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Sign Up",
                description:
                  "Create your account and set your preferences in minutes.",
              },
              {
                step: "2",
                title: "Schedule Meetings",
                description:
                  "Use our intuitive drag-and-drop calendar to plan meetings.",
              },
              {
                step: "3",
                title: "Get Insights",
                description:
                  "Receive AI-powered suggestions and track meeting success.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Meetings?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Join thousands of teams who've improved their meeting efficiency
          </p>
          {!user && (
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                Get Started Free
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
