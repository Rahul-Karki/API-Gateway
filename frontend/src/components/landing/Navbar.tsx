import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="flex justify-between items-center px-8 py-4 border-b bg-background">
      <h1 className="text-xl font-bold">API Gateway Tester</h1>

      <div className="flex gap-4">
        <Link to="/features">Features</Link>
        <Link to="/login">
          <Button variant="outline">Login</Button>
        </Link>
        <Link to="/signup">
          <Button>Sign Up</Button>
        </Link>
      </div>
    </div>
  );
}