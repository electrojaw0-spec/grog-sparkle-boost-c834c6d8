export interface Subject {
  id: string;
  name: string;
  short: string;
  emoji: string;
  topics: string[];
  questionCount: number;
  hue: string; // CSS color for accent
}

export const SUBJECTS: Subject[] = [
  { id: "mathematics", name: "Mathematics", short: "Math", emoji: "🧮", hue: "oklch(0.66 0.17 265)",
    topics: ["Algebra", "Geometry", "Trigonometry", "Statistics", "Calculus"], questionCount: 240 },
  { id: "english", name: "English Language", short: "English", emoji: "📖", hue: "oklch(0.66 0.20 295)",
    topics: ["Comprehension", "Summary", "Lexis", "Essay", "Oral"], questionCount: 180 },
  { id: "physics", name: "Physics", short: "Physics", emoji: "⚛️", hue: "oklch(0.72 0.16 220)",
    topics: ["Mechanics", "Waves", "Electricity", "Optics", "Modern Physics"], questionCount: 200 },
  { id: "chemistry", name: "Chemistry", short: "Chem", emoji: "🧪", hue: "oklch(0.70 0.17 160)",
    topics: ["Atomic Structure", "Bonding", "Kinetics", "Organic", "Electrochem"], questionCount: 195 },
  { id: "biology", name: "Biology", short: "Bio", emoji: "🧬", hue: "oklch(0.74 0.18 145)",
    topics: ["Cells", "Genetics", "Ecology", "Human Bio", "Evolution"], questionCount: 210 },
  { id: "economics", name: "Economics", short: "Econ", emoji: "📈", hue: "oklch(0.78 0.16 70)",
    topics: ["Demand & Supply", "National Income", "Money & Banking", "Trade"], questionCount: 175 },
  { id: "government", name: "Government", short: "Govt", emoji: "🏛️", hue: "oklch(0.68 0.20 30)",
    topics: ["Democracy", "Constitution", "Int'l Orgs", "Political Concepts"], questionCount: 160 },
  { id: "literature", name: "Literature", short: "Lit", emoji: "📚", hue: "oklch(0.66 0.20 320)",
    topics: ["African Drama", "Prose", "Poetry", "Devices", "Oral Lit"], questionCount: 145 },
  { id: "ict", name: "ICT", short: "ICT", emoji: "💻", hue: "oklch(0.72 0.16 245)",
    topics: ["Hardware", "Software", "Networks", "Database", "Programming"], questionCount: 130 },
  { id: "accounting", name: "Financial Accounting", short: "Acct", emoji: "💰", hue: "oklch(0.74 0.16 130)",
    topics: ["Double Entry", "Trial Balance", "Final Accounts", "Depreciation", "Control Accounts"], questionCount: 400 },
  { id: "insurance", name: "Insurance", short: "Insur", emoji: "🛡️", hue: "oklch(0.70 0.16 240)",
    topics: ["Principles", "Life Insurance", "General Insurance", "Reinsurance", "Claims"], questionCount: 400 },
  { id: "business-management", name: "Business Management", short: "BizMgt", emoji: "🏢", hue: "oklch(0.72 0.17 50)",
    topics: ["Management", "Organisation", "Marketing", "HRM", "Finance"], questionCount: 400 },
  { id: "geography", name: "Geography", short: "Geo", emoji: "🌍", hue: "oklch(0.70 0.16 180)",
    topics: ["Physical", "Human", "Map Reading", "Climate", "Nigeria"], questionCount: 400 },
  { id: "electricity", name: "Electrical Installation", short: "Elec", emoji: "⚡", hue: "oklch(0.78 0.17 90)",
    topics: ["Circuits", "Wiring", "Safety", "Machines", "Measurement"], questionCount: 400 },
  { id: "animal-husbandry", name: "Animal Husbandry", short: "AnimHus", emoji: "🐄", hue: "oklch(0.72 0.17 110)",
    topics: ["Livestock", "Nutrition", "Diseases", "Breeding", "Housing"], questionCount: 400 },
  { id: "agriculture", name: "Agricultural Science", short: "Agric", emoji: "🌾", hue: "oklch(0.74 0.18 140)",
    topics: ["Soil", "Crops", "Farm Tools", "Pests", "Economics"], questionCount: 400 },
  { id: "commerce", name: "Commerce", short: "Comm", emoji: "🛒", hue: "oklch(0.72 0.16 30)",
    topics: ["Trade", "Aids to Trade", "Business Units", "Banking", "Documents"], questionCount: 400 },
  { id: "fishery", name: "Fishery", short: "Fish", emoji: "🐟", hue: "oklch(0.72 0.16 210)",
    topics: ["Fish Biology", "Pond Mgmt", "Feeding", "Harvesting", "Preservation"], questionCount: 400 },
];
