export type CurationSource = {
  id: string;
  name: string;
  category: string;
  url: string;
  hosts: string[];
  note: string;
};

export const CURATION_SOURCES: CurationSource[] = [
  { id: "bbc-politics", name: "BBC News", category: "politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "UK politics desk · independent reporting" },
  { id: "bbc-business", name: "BBC News", category: "business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "Business desk · independent reporting" },
  { id: "bbc-world", name: "BBC News", category: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "World desk · independent reporting" },
  { id: "bbc-culture", name: "BBC News", category: "culture", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "Arts and entertainment desk · independent reporting" },
  { id: "bbc-science", name: "BBC News", category: "science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "Science and environment desk · independent reporting" },
  { id: "nasa-science", name: "NASA", category: "science", url: "https://www.nasa.gov/news-release/feed/", hosts: ["nasa.gov"], note: "Official agency releases · primary source" },
  { id: "bbc-technology", name: "BBC News", category: "technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", hosts: ["bbc.com", "bbc.co.uk"], note: "Technology desk · independent reporting" },
];
