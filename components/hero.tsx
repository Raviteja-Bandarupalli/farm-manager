import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-16 lg:pt-20">
      <div className="absolute inset-0 z-0">
        <img
          src="/modern-poultry-farm-broiler-chickens-indoor-farmin.jpg"
          alt="Broiler Farm"
          className="w-full h-full object-cover brightness-50"
        />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 text-balance leading-tight">
            Complete Broiler Farm Management Solution
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto text-pretty leading-relaxed">
            Streamline your poultry operations with real-time flock tracking, inventory management, and performance
            analytics all in one powerful platform
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
              className="bg-transparent text-white border-white hover:bg-white hover:text-primary w-full sm:w-auto font-semibold"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
