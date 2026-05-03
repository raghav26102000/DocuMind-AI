import "./home.css";
import HeroSection from "./HeroSection";

import ExploreSchemesSection from "./ExploreSchemesSection";
import BenefitsSection from "./BenefitsSection";
import KeyFeaturesSection from "./KeyFeaturesSection";
import AboutUsSection from "./AboutUsSection";
import FAQSection from "./FAQSection";
import SchemeCategorySection from "./SchemeCategory";

export default function HomePage() {
  return (
    <div className="homePageWrapper">
      <HeroSection />
      <ExploreSchemesSection />
      <SchemeCategorySection />
      <BenefitsSection />
      <KeyFeaturesSection />
      <AboutUsSection />
      <FAQSection />
    </div>
  );
}
