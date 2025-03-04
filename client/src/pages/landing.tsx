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
  Globe,
} from "lucide-react";
import {
  SiGmail,
  SiGoogle,
  SiSlack,
  SiZoom,
  SiCisco,
  SiMicrosoft,
} from "react-icons/si";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/">
                <span className="text-2xl font-bold text-primary">MeetFlow</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features">
                <span className="text-muted-foreground hover:text-foreground">Features</span>
              </Link>
              <Link href="/solutions">
                <span className="text-muted-foreground hover:text-foreground">Solutions</span>
              </Link>
              <Link href="/pricing">
                <span className="text-muted-foreground hover:text-foreground">Pricing</span>
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Log in</Button>
                  </Link>
                  <Link href="/signup">
                    <Button>Sign up free</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              Easy scheduling <span className="text-primary">ahead</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Smarter scheduling with AI-powered insights. Streamline your meetings,
              boost productivity, and make every interaction count.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user && (
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Sign up for free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Integration Logos */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Seamlessly connects with your favorite tools
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-muted-foreground/60">
              <SiGmail className="h-8 w-8" />
              <SiGoogle className="h-8 w-8" />
              <SiSlack className="h-8 w-8" />
              <SiZoom className="h-8 w-8" />
              <SiCisco className="h-8 w-8" />
              <SiMicrosoft className="h-8 w-8" />
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

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24%</div>
              <p className="text-muted-foreground">Less time spent scheduling</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">20%</div>
              <p className="text-muted-foreground">Increase in meeting efficiency</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">260%</div>
              <p className="text-muted-foreground">ROI on meeting management</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Schedule your team in record time</h2>
            <p className="text-lg text-muted-foreground">
              Let AI handle the complexities of scheduling while you focus on what matters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Share your booking page</h3>
              <p className="text-muted-foreground">
                Send guests your personalized booking page
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">They pick a time</h3>
              <p className="text-muted-foreground">
                Guests book available time slots that work for everyone
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">The meeting is scheduled</h3>
              <p className="text-muted-foreground">
                The event is added to everyone's calendar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Start scheduling smarter today</h2>
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
                Get started free
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/features">
                    <span className="text-muted-foreground hover:text-foreground">
                      Features
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/security">
                    <span className="text-muted-foreground hover:text-foreground">
                      Security
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Solutions</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/enterprise">
                    <span className="text-muted-foreground hover:text-foreground">
                      Enterprise
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/teams">
                    <span className="text-muted-foreground hover:text-foreground">
                      Teams
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help">
                    <span className="text-muted-foreground hover:text-foreground">
                      Help Center
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog">
                    <span className="text-muted-foreground hover:text-foreground">
                      Blog
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about">
                    <span className="text-muted-foreground hover:text-foreground">
                      About Us
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <span className="text-muted-foreground hover:text-foreground">
                      Contact
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}