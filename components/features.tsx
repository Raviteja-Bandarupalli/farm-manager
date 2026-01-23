import { BarChart3, Package, Users, Smartphone, Bell, FileText } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Track FCR, mortality rates, and production costs with automatic KPI calculations and visual dashboards",
    },
    {
      icon: Package,
      title: "Inventory Management",
      description: "Monitor feed, medicine, and supplies with real-time stock levels and low-stock alerts",
    },
    {
      icon: Users,
      title: "Multi-User Access",
      description: "Farm owners get full overview while staff access daily logging and task management features",
    },
    {
      icon: Smartphone,
      title: "Offline-First Mobile",
      description: "Log data anywhere, anytime. Automatic sync when connection is available",
    },
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Vaccination schedules, task assignments, and medicine alerts keep your operations on track",
    },
    {
      icon: FileText,
      title: "Detailed Reports",
      description: "Generate batch summaries, profit/loss statements, and export data for deeper analysis",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mb-16 text-center mx-auto">
          <p className="text-sm font-semibold text-muted-foreground mb-4 tracking-wide uppercase">Core Features</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            Everything You Need to Manage Your Broiler Farm
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature) => (
            <div key={feature.title} className="group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
