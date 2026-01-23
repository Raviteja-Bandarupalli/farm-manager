import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Products() {
  const plans = [
    {
      title: "Starter",
      price: "Free",
      description: "Perfect for small farms getting started",
      features: ["Up to 2 farms", "1,000 birds per batch", "Basic analytics", "Mobile app access", "Daily logging"],
    },
    {
      title: "Professional",
      price: "$49/month",
      description: "For growing operations",
      features: [
        "Unlimited farms",
        "Unlimited birds",
        "Advanced analytics & reports",
        "Multi-user access",
        "Inventory management",
        "Task & reminder system",
        "Priority support",
      ],
      popular: true,
    },
    {
      title: "Enterprise",
      price: "Custom",
      description: "For large-scale operations",
      features: [
        "Everything in Professional",
        "Custom integrations",
        "Dedicated account manager",
        "API access",
        "Custom reporting",
        "Training & onboarding",
      ],
    },
  ]

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-muted-foreground mb-4 tracking-wide uppercase">Pricing Plans</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Choose the Right Plan for Your Farm
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Start free and upgrade as you grow. All plans include mobile apps for iOS and Android
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.title}
              className={`relative overflow-hidden ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  Most Popular
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.title}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <Link href="/signup">
                  <Button className="w-full mb-6" variant={plan.popular ? "default" : "outline"}>
                    {plan.title === "Starter" ? "Get Started" : "Contact Sales"}
                  </Button>
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
