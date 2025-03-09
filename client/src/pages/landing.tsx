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
  SiGithub,
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
                <span className="text-2xl font-bold text-primary">MeetMate</span>
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
      <section className="relative pb-20 pt-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              Easy scheduling ahead
            </h1>
            <p className="text-xl text-muted-foreground mb-12">
              Smarter scheduling with AI-powered insights. Streamline your meetings,
              boost productivity, and make every interaction count.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user && (
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                    Sign up for free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Integration Logos */}
          <div className="text-center mt-32">
            <p className="text-sm font-medium text-muted-foreground mb-8">
              Seamlessly connects with your favorite tools
            </p>
            <div className="flex flex-wrap justify-center gap-12 items-center">
              <SiGmail className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
              <SiGoogle className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
              <SiSlack className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
              <SiZoom className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
              <SiCisco className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
              <SiGithub className="h-10 w-10 text-muted-foreground/60 hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">
              Everything You Need for Better Meetings
            </h2>
            <p className="text-xl text-muted-foreground">
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
                className="bg-background/50 backdrop-blur p-8 rounded-lg border hover:shadow-lg transition-all hover:scale-105"
              >
                <feature.icon className="h-12 w-12 text-primary mb-6" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section with Gradient Cards */}
      <section className="py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur p-8 rounded-lg border">
              <div className="text-5xl font-bold text-primary mb-4">24%</div>
              <p className="text-lg text-muted-foreground">Less time spent scheduling</p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur p-8 rounded-lg border">
              <div className="text-5xl font-bold text-primary mb-4">20%</div>
              <p className="text-lg text-muted-foreground">Increase in meeting efficiency</p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur p-8 rounded-lg border">
              <div className="text-5xl font-bold text-primary mb-4">260%</div>
              <p className="text-lg text-muted-foreground">ROI on meeting management</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary-foreground">
            Start scheduling smarter today
          </h2>
          <p className="text-xl mb-12 text-primary-foreground/90 max-w-2xl mx-auto">
            Join thousands of teams who've improved their meeting efficiency with our AI-powered scheduling platform.
          </p>
          {!user && (
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6"
              >
                Get started free
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div>
              <h3 className="font-semibold mb-6">Product</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/features">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Features
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/security">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Security
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-6">Solutions</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/enterprise">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Enterprise
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/teams">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Teams
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-6">Resources</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/help">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Help Center
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      Blog
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-6">Company</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/about">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      About Us
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
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