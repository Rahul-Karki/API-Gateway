import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <div className="text-center py-20 bg-muted">
      <h2 className="text-3xl font-bold mb-4">
        Start Testing Your APIs Today 🚀
      </h2>

      <Link to="/signup">
        <Button size="lg">Create Account</Button>
      </Link>
    </div>
  );
}