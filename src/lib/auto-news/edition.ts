import { unstable_cache } from "next/cache";
import { CURATION_SOURCES } from "../curation/sources";
import { collectAutoPool } from "./pool";
import { rankAutoStories, type AutoCandidate } from "./ranking";
import type { Article,Category } from "../types";

// Cache only public source data; request cookies and staff data stay outside this scope.
// A failed revalidation throws and leaves the last good category pool in the Data Cache.
const sourcePool=unstable_cache(collectAutoPool,["brief-beyond-auto-source-pools-v1"],{revalidate:1800});
function id(value:string){let hash=2166136261;for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619);return (hash>>>0).toString(36);}
export async function getAutoEdition(categories:Category[]){
  const results=await Promise.allSettled(categories.map(category=>sourcePool(category.slug)));
  const candidates:AutoCandidate[]=[];const checks:string[]=[];const unavailable:string[]=[];
  results.forEach((result,index)=>{if(result.status==="fulfilled"){candidates.push(...result.value.stories);checks.push(result.value.checkedAt);}else unavailable.push(categories[index].slug);});
  const ranked=rankAutoStories(candidates,categories.map(category=>category.slug));
  const articles:Article[]=ranked.map((story,index)=>{
    const category=categories.find(category=>category.slug===story.category_slug)!;
    return {id:`auto-${story.source_id}-${id(story.source_url)}`,category_id:category.id,category_slug:category.slug,category_name:category.name,title:story.headline,slug:"",dek:story.source_preview,body:"",author:story.source_name,image_url:"",image_alt:"",status:"published",is_featured:false,published_at:story.source_published_at,updated_at:story.observed_at ?? story.source_published_at,source_name:story.source_name,source_url:story.source_url,source_published_at:story.source_published_at,position:index,content_blocks:[],selection:"auto",selection_note:CURATION_SOURCES.find(source=>source.id===story.source_id)?.note};
  });
  return {articles,checkedAt:checks.sort()[0] ?? null,unavailable,retained:checks.some(date=>Date.now()-Date.parse(date)>3600000)};
}
