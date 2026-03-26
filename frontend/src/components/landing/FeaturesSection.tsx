import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Request Routing",
    desc: "Route API calls to multiple services seamlessly.",
  },
  {
    title: "Authentication",
    desc: "Secure APIs using JWT and middleware.",
  },
  {
    title: "Rate Limiting",
    desc: "Prevent abuse with smart request limits.",
  },
  {
    title: "Load Balancing",
    desc: "Distribute traffic efficiently using Nginx.",
  },
];

export default function Features() {
  return (
    <div className="py-20 px-6">
      <h2 className="text-3xl font-bold text-center mb-10">
        Features
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}