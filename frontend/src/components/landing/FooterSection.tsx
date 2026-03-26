import { Github } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono text-gradient">API Gateway Tester</span>
        </div>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} API Gateway Tester. Open source & developer-friendly.
        </p>
        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
          <Github className="w-5 h-5" />
        </a>
      </div>
    </footer>
  );
};

export default FooterSection;
