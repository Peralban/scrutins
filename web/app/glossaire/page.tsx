import type { Metadata } from "next";
import Glossaire from "@/components/Glossaire";

export const metadata: Metadata = { title: "Glossaire", description: "Les mots de l'Assemblée et du site, expliqués simplement." };

export default function Page() {
  return <Glossaire />;
}
