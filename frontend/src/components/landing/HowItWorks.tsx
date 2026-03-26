import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Client Request",
    description: "A client sends an HTTP request to your API Gateway endpoint. The gateway intercepts the request before it reaches any backend service.",
    code: `GET /api/v1/users HTTP/1.1\nHost: gateway.example.com\nAuthorization: Bearer <token>`,
  },
  {
    step: "02",
    title: "Gateway Processing",
    description: "The gateway applies middleware — authentication, rate limiting, request transformation, and caching checks — in a configurable pipeline.",
    code: `→ Auth Check      ✓ Valid token\n→ Rate Limit      ✓ 42/100 requests\n→ Cache Lookup    ✗ Cache miss\n→ Route Match     ✓ /api/v1/users → user-service`,
  },
  {
    step: "03",
    title: "Upstream Routing",
    description: "The request is forwarded to the appropriate upstream service using load balancing. Nginx handles connection pooling and health checks.",
    code: `upstream user-service {\n  server 10.0.1.1:8080 weight=5;\n  server 10.0.1.2:8080 weight=3;\n  keepalive 32;\n}`,
  },
  {
    step: "04",
    title: "Response & Cache",
    description: "The response is sent back through the gateway, cached if applicable, and logged for monitoring. Headers are enriched with rate limit info.",
    code: `HTTP/1.1 200 OK\nX-RateLimit-Remaining: 58\nX-Cache: MISS\nX-Response-Time: 12ms`,
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-mono text-primary tracking-wider uppercase">How It Works</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-foreground">
            Request lifecycle, <span className="text-gradient">visualized</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Understand every step from client request to cached response.
          </p>
        </motion.div>

        <div className="space-y-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="grid md:grid-cols-2 gap-6 items-center"
            >
              <div className={`${i % 2 !== 0 ? "md:order-2" : ""}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-gradient font-mono">{s.step}</span>
                  <h3 className="text-xl font-semibold text-foreground">{s.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
              <div className={`rounded-lg border border-border bg-code p-5 ${i % 2 !== 0 ? "md:order-1" : ""}`}>
                <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                  <code>{s.code}</code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
