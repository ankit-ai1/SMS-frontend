import {
  AppsSection,
  CtaBand,
  EcosystemSection,
  FeatureStrip,
  ModulesSection,
  PricingSection,
  TestimonialsSection,
  WhyChooseUs,
} from "@/components/site/home-sections";
import { HomeHero } from "@/components/site/home-hero";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FeatureStrip />
      <ModulesSection />
      <WhyChooseUs />
      <AppsSection />
      <PricingSection />
      <TestimonialsSection />
      <EcosystemSection />
      <CtaBand />
    </>
  );
}
