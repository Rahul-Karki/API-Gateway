import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/HeroSection";
import Features from "@/components/landing/FeaturesSection";
import CTA from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Features />
      <CTA />
    </div>
  );
}