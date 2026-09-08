import Nav from "./components/Nav";
import TopLinksBar from "./components/TopLinksBar";
import Hero from "./components/Hero";
import PhoneMockupStack from "./components/PhoneMockupStack";
import HowItWorks from "./components/HowItWorks";
import LiveStatsBar from "./components/LiveStatsBar";
import ChainsMesh from "./components/ChainsMesh";
import Partners from "./components/Partners";
import ForAgents from "./components/ForAgents";
import TrustModel from "./components/TrustModel";
import FaqAccordion from "./components/FaqAccordion";
import Footer from "./components/Footer";
import Reveal from "./components/Reveal";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-surface">
      <TopLinksBar />
      <Nav />
      <main className="flex flex-col flex-1">
        <Hero />
        <PhoneMockupStack />
        <HowItWorks />
        <LiveStatsBar />
        <ChainsMesh />
        <Reveal>
          <Partners />
        </Reveal>
        <ForAgents />
        <TrustModel />
        <FaqAccordion />
      </main>
      <Footer />
    </div>
  );
}
