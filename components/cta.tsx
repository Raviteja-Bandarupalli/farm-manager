import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTA() {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-primary">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 text-balance">
            Ready to Transform Your Farm Management?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-10 leading-relaxed">
            Join hundreds of broiler farmers who are optimizing their operations with our platform. Start your free
            trial today - no credit card required
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto font-semibold"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
