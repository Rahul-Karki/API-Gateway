import Navbar from "@/components/landing/Navbar";
import FeaturesHero from "@/components/features/Featureshero";
import FeatureGrid from "@/components/features/Featuresgrid";
import FeatureDeepDive from "@/components/features/Featuredeepdive";
import FeaturesCTA from "@/components/features/Featurescta";
import FooterSection from "@/components/landing/FooterSection";


export default function FeaturesPage() {
  return (
    <main style={{ background: "#050814", minHeight: "100vh" }}>
      <Navbar />
      <FeaturesHero />
      <FeatureGrid />
      <FeatureDeepDive />
      <FeaturesCTA />
      <FooterSection />
    </main>
  );
}