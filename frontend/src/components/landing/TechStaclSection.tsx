import { motion } from "framer-motion";

const techs = [
  { name: "TypeScript", desc: "Type-safe gateway logic and configuration" },
  { name: "Nginx", desc: "High-performance reverse proxy and load balancer" },
  { name: "React", desc: "Interactive dashboard and testing UI" },
];

const TechStackSection = () => {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-mono text-primary tracking-wider uppercase">Tech Stack</span>
          <h2 className="text-4xl font-bold mt-3 mb-12 text-foreground">
            Built on <span className="text-gradient">proven technology</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {techs.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="rounded-lg border border-border bg-card p-8 hover:border-glow transition-colors"
            >
              <h3 className="text-2xl font-bold text-gradient font-mono mb-2">{t.name}</h3>
              <p className="text-muted-foreground text-sm">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
