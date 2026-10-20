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
  { id: "npr-politics", name: "NPR", category: "politics", url: "https://feeds.npr.org/1014/rss.xml", hosts: ["npr.org"], note: "US public media · politics reporting" },
  { id: "npr-business", name: "NPR", category: "business", url: "https://feeds.npr.org/1006/rss.xml", hosts: ["npr.org"], note: "US public media · business reporting" },
  { id: "npr-world", name: "NPR", category: "world", url: "https://feeds.npr.org/1004/rss.xml", hosts: ["npr.org"], note: "US public media · world reporting" },
  { id: "npr-culture", name: "NPR", category: "culture", url: "https://feeds.npr.org/1008/rss.xml", hosts: ["npr.org"], note: "US public media · culture reporting" },
  { id: "npr-science", name: "NPR", category: "science", url: "https://feeds.npr.org/1007/rss.xml", hosts: ["npr.org"], note: "US public media · science reporting" },
  { id: "npr-technology", name: "NPR", category: "technology", url: "https://feeds.npr.org/1019/rss.xml", hosts: ["npr.org"], note: "US public media · technology reporting" },
  { id: "guardian-politics", name: "The Guardian", category: "politics", url: "https://www.theguardian.com/us-news/us-politics/rss", hosts: ["theguardian.com"], note: "Politics desk · reporting and analysis" },
  { id: "guardian-business", name: "The Guardian", category: "business", url: "https://www.theguardian.com/us/business/rss", hosts: ["theguardian.com"], note: "Business desk · reporting and analysis" },
  { id: "guardian-world", name: "The Guardian", category: "world", url: "https://www.theguardian.com/world/rss", hosts: ["theguardian.com"], note: "World desk · reporting and analysis" },
  { id: "guardian-culture", name: "The Guardian", category: "culture", url: "https://www.theguardian.com/us/culture/rss", hosts: ["theguardian.com"], note: "Culture desk · reporting and analysis" },
  { id: "guardian-science", name: "The Guardian", category: "science", url: "https://www.theguardian.com/science/rss", hosts: ["theguardian.com"], note: "Science desk · reporting and analysis" },
  { id: "guardian-technology", name: "The Guardian", category: "technology", url: "https://www.theguardian.com/us/technology/rss", hosts: ["theguardian.com"], note: "Technology desk · reporting and analysis" },
  { id: "pbs-politics", name: "PBS News", category: "politics", url: "https://www.pbs.org/newshour/feeds/rss/politics", hosts: ["pbs.org"], note: "US public media · politics reporting" },
  { id: "pbs-world", name: "PBS News", category: "world", url: "https://www.pbs.org/newshour/feeds/rss/world", hosts: ["pbs.org"], note: "US public media · world reporting" },
  { id: "aljazeera-world", name: "Al Jazeera", category: "world", url: "https://www.aljazeera.com/xml/rss/all.xml", hosts: ["aljazeera.com"], note: "Global reporting · Middle East and international coverage" },
];
