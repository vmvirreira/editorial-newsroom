import { canonicalSourceUrl, type FeedStory } from "../curation/feed.ts";
import { CURATION_SOURCES, type CurationSource } from "../curation/sources.ts";
export type AutoCandidate = FeedStory & { observed_at?: string };
export type RankedStory = AutoCandidate & { score: number };
const words: Record<string,string[]> = {
  politics:["election","vote","voting","government","president","minister","senate","congress","parliament","policy","trump","democrat","republican","campaign","court","political"],
  business:["economy","economic","business","market","stock","trade","tariff","inflation","bank","interest","company","profit","jobs","employment","finance","investment","earnings","retail","ceo","industry","corporate"],
  world:["international","global","world","diplomatic","united nations","ukraine","russia","china","europe","africa","asia","middle east","peace","conflict","foreign","ceasefire","iran","israel","lebanon","gaza","india","pakistan","japan","taiwan","canada","australia","brazil","venezuela","nato"],
  culture:["art","artist","music","film","movie","book","novel","museum","culture","cultural","theatre","theater","poetry","author","literature","festival","exhibition","actor","actress","cartoon","television","animation"],
  science:["science","scientist","research","study","space","nasa","climate","planet","discovery","species","physics","biology","genome","experiment","university","telescope","health","medical","medicine","vaccine","disease","clinical","gene","cancer","treatment","trial","studies"],
  technology:["technology","software","artificial intelligence"," ai ","chip","semiconductor","computer","cyber","cybersecurity","security","internet","digital","robot","apple","google","microsoft","meta","startup","computing","smartphone","device","online","data","network"],
};
const stop = new Set("a an the of to in on at for and or but with from by as is are was were be been this that it its over after before new latest live news bbc reuters ap guardian says said say updates update".split(" "));
export function headlineTokens(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/\s[-–—|]\s(?:ap news|reuters|bbc news|the guardian).*$/i,"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").match(/[a-z0-9]+/g)?.filter(word=>word.length>1 && !stop.has(word)).map(word=>word.length>4 && word.endsWith("s") ? word.slice(0,-1) : word) ?? []);
}
export function sameEvent(a: string, b: string): boolean {
  const left=headlineTokens(a),right=headlineTokens(b);
  if(!left.size || !right.size)return a.trim().toLowerCase()===b.trim().toLowerCase();
  const overlap=[...left].filter(word=>right.has(word)).length;
  return overlap===left.size && overlap===right.size || overlap>=3 && overlap/Math.min(left.size,right.size)>=0.65 && overlap/(left.size+right.size-overlap)>=0.44;
}
export function publisher(source: CurationSource): string { return source.publisherHost ?? source.hosts[0]; }
function topicRelevance(story: AutoCandidate): number {
  const stem=(word:string)=>word.length>4 && word.endsWith("s") ? word.slice(0,-1) : word;
  const normalized=` ${(story.headline+" "+story.source_preview).toLowerCase().match(/[a-z0-9]+/g)?.map(stem).join(" ") ?? ""} `;
  return (words[story.category_slug] ?? []).filter(word=>normalized.includes(` ${word.trim().split(/\s+/).map(stem).join(" ")} `)).length;
}
function eligible(story: AutoCandidate, source: CurationSource, now: number): boolean {
  const published=Date.parse(story.source_published_at),observed=Date.parse(story.observed_at ?? "");
  const reference=Number.isFinite(observed) ? Math.min(observed,now) : now;
  return source.kind!=="community" && (!source.publisherHost || topicRelevance(story)>0) && source.category===story.category_slug && Boolean(canonicalSourceUrl(story.source_url,source)) && story.headline.length>=3 && Number.isFinite(published) && published<=now && reference-published<=72*3600000 && !/^(opinion|editorial|letters|sponsored|advertisement)\s*[:|–—-]/i.test(story.headline);
}
function baseScore(story: AutoCandidate, source: CurationSource, now: number): number {
  const observed=Date.parse(story.observed_at ?? "");const reference=Number.isFinite(observed) ? Math.min(now,observed) : now;
  const hours=Math.max(0,(reference-Date.parse(story.source_published_at))/3600000);
  const relevance=topicRelevance(story);
  const established=/^(bbc|npr|pbs|ap|reuters)-/.test(source.id) ? 12 : source.kind==="primary" || source.id.startsWith("nasa-") ? 6 : 8;
  return Math.max(0,40-hours*0.65)+Math.min(7,relevance)*4+established+(story.source_preview.trim().length>=60 ? 4 : 0);
}
export function rankAutoStories(candidates: AutoCandidate[], categories: readonly string[], now=Date.now(), sources=CURATION_SOURCES): RankedStory[] {
  const catalog=new Map(sources.map(source=>[source.id,source]));const urls=new Set<string>();
  const valid=candidates.flatMap(story=>{
    const source=catalog.get(story.source_id);if(!source || !categories.includes(story.category_slug) || !eligible(story,source,now))return [];
    const url=canonicalSourceUrl(story.source_url,source)!;
    const key=`${story.category_slug}:${url}`;if(urls.has(key))return [];urls.add(key);
    return [{...story,source_url:url,score:baseScore(story,source,now),publisher:publisher(source)}];
  }).sort((a,b)=>b.score-a.score || a.source_url.localeCompare(b.source_url));
  const clusters:typeof valid[]=[];
  for(const story of valid){const cluster=clusters.find(group=>sameEvent(group[0].headline,story.headline) || group.some(item=>item.source_url===story.source_url));if(cluster)cluster.push(story);else clusters.push([story]);}
  const selected:RankedStory[]=[];const used=new Set<number>();const publishers=new Map<string,Set<string>>();
  for(let round=0;round<2;round++)for(const category of categories){
    const previous=publishers.get(category) ?? new Set<string>();
    const choices=clusters.flatMap((cluster,index)=>{
      if(used.has(index))return [];
      const eligible=cluster.filter(story=>story.category_slug===category);
      if(!eligible.length)return [];
      const distinct=new Set(cluster.map(story=>story.publisher)).size;
      const story=eligible.find(story=>!previous.has(story.publisher)) ?? eligible[0];return [{index,story:{...story,score:story.score+Math.min(3,distinct-1)*4}}];
    }).sort((a,b)=>b.story.score-a.story.score || a.story.source_url.localeCompare(b.story.source_url));
    const pick=choices.find(choice=>!previous.has(choice.story.publisher)) ?? choices[0];
    if(pick){used.add(pick.index);previous.add(pick.story.publisher);publishers.set(category,previous);selected.push(pick.story);}
  }
  return selected.sort((a,b)=>b.score-a.score || a.source_url.localeCompare(b.source_url));
}
