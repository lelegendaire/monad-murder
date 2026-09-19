export type Clue = {
  id: number;
  title: string;
  description: string;
  location: string;
};

export const CLUES: Clue[] = [
  {
    id: 1,
    title: "The Clock",
    description:
      "The old clock stopped during the evening. The crime happened sometime between 16:00 and 22:00.",
    location: "Dining Room",
  },
  {
    id: 2,
    title: "The Weapon Rack",
    description:
      "One of the weapons normally stored here was recently removed.",
    location: "Kitchen",
  },
  {
    id: 3,
    title: "The Footprints",
    description:
      "Fresh footprints were found leading into the house from outside.",
    location: "Garden",
  },
  {
    id: 4,
    title: "The Torn Note",
    description:
      "A torn note suggests that someone planned to meet another person at the house.",
    location: "Library",
  },
  {
    id: 5,
    title: "The Witness",
    description:
      "A witness confirms that someone was inside the house shortly before the crime.",
    location: "Office",
  },
  {
    id: 6,
    title: "The Broken Window",
    description:
      "The bedroom window was broken from the inside.",
    location: "Bedroom",
  },
  {
    id: 7,
    title: "The Blood Trail",
    description:
      "A small blood trail was discovered near the crime scene.",
    location: "Hallway",
  },
  {
    id: 8,
    title: "The Hidden Message",
    description:
      "A hidden message suggests that the victim knew their attacker.",
    location: "Basement",
  },
];