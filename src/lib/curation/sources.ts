export type CurationSource = {
  id: string;
  name: string;
  category: string;
  url: string;
  hosts: string[];
  note: string;
  kind?: "reporting" | "primary" | "community";
  linkField?: "comments";
  publisherHost?: string;
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

// Discovery feeds retain Google News links and verify each item's publisher metadata.
// These are not direct AP/Reuters feeds or a license to republish their reporting.
const discoveryTopics: Record<string, string> = {
  politics: '(politics OR election OR government)',
  business: '(business OR economy OR markets)',
  world: '(world OR international)',
  culture: '(arts OR culture OR entertainment)',
  science: '(science OR research OR space)',
  technology: '(technology OR software OR cybersecurity)',
};
for (const publisher of [
  { id: "ap", name: "Associated Press", host: "apnews.com" },
  { id: "reuters", name: "Reuters", host: "reuters.com" },
]) {
  for (const [category, topic] of Object.entries(discoveryTopics)) {
    CURATION_SOURCES.push({
      id: `${publisher.id}-${category}`, name: `${publisher.name} via Google News`, category,
      url: `https://news.google.com/rss/search?${new URLSearchParams({ q: `site:${publisher.host} ${topic} when:14d`, hl: "en-US", gl: "US", ceid: "US:en" })}`,
      hosts: ["news.google.com"], publisherHost: publisher.host,
      note: "Publisher-specific discovery · opens through Google News · verify the original report",
    });
  }
}

CURATION_SOURCES.push(
  { id: "propublica-politics", name: "ProPublica", category: "politics", url: "https://www.propublica.org/feeds/propublica/main", hosts: ["propublica.org"], note: "Investigative journalism · public-interest reporting" },
  { id: "dw-world", name: "DW", category: "world", url: "https://rss.dw.com/rdf/rss-en-world", hosts: ["dw.com"], note: "German international public broadcaster · world reporting" },
  { id: "france24-world", name: "France 24", category: "world", url: "https://www.france24.com/en/rss", hosts: ["france24.com"], note: "International public broadcaster · global reporting" },
  { id: "un-world", name: "UN News", category: "world", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", hosts: ["news.un.org"], kind: "primary", note: "United Nations newsroom · institutional primary source" },
  { id: "smithsonian-culture", name: "Smithsonian Magazine", category: "culture", url: "https://www.smithsonianmag.com/rss/latest_articles/", hosts: ["smithsonianmag.com"], note: "History, arts, science and culture magazine · mixed coverage" },
  { id: "hyperallergic-culture", name: "Hyperallergic", category: "culture", url: "https://hyperallergic.com/rss/", hosts: ["hyperallergic.com"], note: "Arts journalism · reporting and criticism" },
  { id: "nature-science", name: "Nature", category: "science", url: "https://www.nature.com/nature.rss", hosts: ["nature.com"], note: "Scientific journal · research, news and commentary" },
  { id: "sciencedaily-science", name: "ScienceDaily", category: "science", url: "https://www.sciencedaily.com/rss/top/science.xml", hosts: ["sciencedaily.com"], note: "Research-release summaries · check the study and its limitations" },
  { id: "ars-technology", name: "Ars Technica", category: "technology", url: "https://feeds.arstechnica.com/arstechnica/index", hosts: ["arstechnica.com"], note: "Technology and science · reporting and analysis" },
  { id: "verge-technology", name: "The Verge", category: "technology", url: "https://www.theverge.com/rss/index.xml", hosts: ["theverge.com"], note: "Technology desk · reporting and reviews" },
  { id: "techcrunch-technology", name: "TechCrunch", category: "technology", url: "https://techcrunch.com/feed/", hosts: ["techcrunch.com"], note: "Startups and technology business reporting" },
  { id: "hackernews-technology", name: "Hacker News", category: "technology", url: "https://news.ycombinator.com/rss", hosts: ["news.ycombinator.com"], kind: "community", linkField: "comments", note: "Community discussion · leads to verify, not independently confirmed reporting" },
);

for (const [category, subreddit] of Object.entries({ politics: "politics", business: "Economics", world: "worldnews", culture: "books", science: "science", technology: "technology" })) {
  CURATION_SOURCES.push({
    id: `reddit-${category}`, name: `Reddit r/${subreddit}`, category,
    url: `https://www.reddit.com/r/${subreddit}/.rss`, hosts: ["reddit.com"], kind: "community",
    note: "Community discussion · verify linked reporting and claims · availability may be rate-limited",
  });
}

for (const [category, desk] of Object.entries({ business: "economy", culture: "arts", science: "science" })) {
  CURATION_SOURCES.push({ id: `pbs-${category}`, name: "PBS News", category, url: `https://www.pbs.org/newshour/feeds/rss/${desk}`, hosts: ["pbs.org"], note: "US public media · reporting and analysis" });
}
for (const [category, desk] of Object.entries({ politics: "politics", business: "business", culture: "arts", technology: "technology" })) {
  CURATION_SOURCES.push({ id: `conversation-${category}`, name: "The Conversation", category, url: `https://theconversation.com/us/${desk}/articles.atom`, hosts: ["theconversation.com"], note: "Academic authors · research-informed analysis and commentary" });
}
