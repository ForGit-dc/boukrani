import { useEffect } from "react";
import DataScientistHero from "@/components/hero/DataScientistHero";

const Index = () => {
  useEffect(() => {
    document.title = "Mohamed Boukrani - Data Scientist / AI Engineer";
  }, []);

  return <DataScientistHero />;
};

export default Index;
