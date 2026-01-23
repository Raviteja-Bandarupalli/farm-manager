export function About() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold text-muted-foreground mb-4 tracking-wide uppercase">How It Works</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
              Manage Your Entire Operation From One Platform
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                From day-old chicks to market-ready birds, track every aspect of your broiler operation. Log daily
                activities, monitor health metrics, and make data-driven decisions to maximize profitability.
              </p>
              <p>
                Our platform calculates FCR, mortality rates, feed conversion, and production costs automatically. Get
                instant insights into which batches are performing well and where you can improve efficiency.
              </p>
              <p>
                With offline-first mobile capabilities, your team can record data in the field without internet. All
                records sync automatically when connection is restored, ensuring you never lose critical farm data.
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="grid grid-cols-2 gap-4">
              <img
                src="/mobile-app-dashboard-with-charts.jpg"
                alt="Mobile dashboard"
                className="w-full h-64 object-cover rounded-lg"
              />
              <img
                src="/farm-data-analytics-screen.jpg"
                alt="Analytics screen"
                className="w-full h-64 object-cover rounded-lg mt-8"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
