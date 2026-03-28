import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";


export default function LandingPage() {
  return (
    <main className="landing-root">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <CTASection />
      <FooterSection />
    </main>
  );
}