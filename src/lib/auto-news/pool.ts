import { CURATION_SOURCES, type CurationSource } from "../curation/sources.ts";
import { fetchSource, type FeedStory } from "../curation/feed.ts";
export async function collectAutoPool(category:string,fetcher:(source:CurationSource)=>Promise<FeedStory[]>=fetchSource,now=Date.now(),catalog=CURATION_SOURCES){
  const sources=catalog.filter(source=>source.category===category && source.kind!=="community");
  const results=await Promise.allSettled(sources.map(fetcher));const checkedAt=new Date(now).toISOString();
  const stories=results.flatMap(result=>result.status==="fulfilled" ? result.value : []).filter(story=>{const age=now-Date.parse(story.source_published_at);return age>=0 && age<=72*3600000;});
  if(!stories.length)throw new Error(`No suitable current sources for ${category}`);
  return {checkedAt,stories:stories.map(story=>({...story,observed_at:checkedAt}))};
}
