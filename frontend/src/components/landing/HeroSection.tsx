import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="text-center py-24 px-6">
      <h1 className="text-5xl font-bold mb-6">
        Test & Manage APIs Effortlessly
      </h1>

      <p className="text-muted-foreground max-w-xl mx-auto mb-8">
        A powerful API Gateway tester built with React, Nginx, and TypeScript.
        Monitor, route, and debug APIs in one place.
      </p>

      <div className="flex justify-center gap-4">
        <Link to="/signup">
          <Button size="lg">Get Started</Button>
        </Link>

        <Link to="/features">
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </Link>
      </div>
    </div>
  );
}