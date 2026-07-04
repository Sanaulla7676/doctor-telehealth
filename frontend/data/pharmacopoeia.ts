export interface PharmacopoeiaItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

export const pharmacopoeiaData: PharmacopoeiaItem[] = [
  {
    id: "botanical",
    title: "Botanical Remedies",
    description: "Pure, organic plant extractions selected for gentle vital stimulation.",
    imageUrl: "/botonical.png"
  },
  {
    id: "mineral",
    title: "Mineral Minerals",
    description: "Systematically triturated minerals built to reinforce biochemical structure.",
    imageUrl: "/Mineral Minerals.jpg"
  },
  {
    id: "potentized",
    title: "Potentized Dilutions",
    description: "Serial dilutions succussed to remove toxicity while increasing vital healing energy.",
    imageUrl: "/Potentized Dilutions.jpg"
  },
  {
    id: "tissue-salts",
    title: "Tissue Bio-Chemic Salts",
    description: "Schuessler tissue salts designed to support trace cellular nutrition.",
    imageUrl: "/Tissue Bio-Chemic Salts.png"
  }
];

export const classicalMethodologies = [
  "Hahnemannian Classical",
  "Kentasian Constitutional",
  "Boericke Therapy",
  "Schuessler Biochemistry",
  "Boget's Synoptic Methods",
  "Miasmatic Cleansing",
  "Sankaran Sensation Protocols"
];
