import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleTextParts,articlePlainText,safeArticleHref} from '../src/lib/text/article-text.ts';

test('Imported HTML links become labeled URLs with entities decoded and paragraph boundaries preserved',()=>{
 const source='<p>The president <a href="https://example.com/report?a=1&amp;b=2" onclick="alert(1)">claimed &amp; insisted</a> this.</p><p>More context.</p>';
 const parts=articleTextParts(source);
 assert.deepEqual(parts.filter(part=>part.href),[{text:'claimed & insisted',href:'https://example.com/report?a=1&b=2'}]);
 assert.equal(articlePlainText(source),'The president claimed & insisted this.\n\nMore context.');
});
test('Plain web addresses link without surrounding punctuation, retaining balanced URL parentheses',()=>{
 const parts=articleTextParts('See https://example.com/report, (https://en.wikipedia.org/wiki/Mars_(planet)). Also www.example.org/test.');
 assert.deepEqual(parts.filter(part=>part.href).map(part=>part.href),['https://example.com/report','https://en.wikipedia.org/wiki/Mars_(planet)','https://www.example.org/test']);
 assert.equal(parts.map(part=>part.text).join(''),'See https://example.com/report, (https://en.wikipedia.org/wiki/Mars_(planet)). Also www.example.org/test.');
});
test('Encoded markup is recognized while executable HTML, event handlers and unsafe link schemes are discarded',()=>{
 assert.deepEqual(articleTextParts('&lt;a href=&quot;https://example.com/&quot;&gt;Read more&lt;/a&gt;'),[{text:'Read more',href:'https://example.com/'}]);
 const parts=articleTextParts('<script>alert(1)</script><style>bad</style><svg><script>bad</script></svg><img src=x onerror=alert(1)><a href="java&#x73;cript:alert(1)">Readable label</a> <a href="data:text/html,bad">Data label</a>');
 assert.equal(parts.filter(part=>part.href).length,0);assert.equal(parts.map(part=>part.text).join(''),'Readable label Data label');
 for(const href of ['javascript:alert(1)','data:text/html,bad','//evil.test','https://user:pass@example.com/','https://example.com/\nfoo'])assert.equal(safeArticleHref(href),null);
});
test('Link labels do not become nested links and ordinary text keeps its characters',()=>{
 const parts=articleTextParts('<a href="https://example.com/">https://example.org/</a> — Fish &amp; chips; 2 < 3.');
 assert.deepEqual(parts.filter(part=>part.href),[{text:'https://example.org/',href:'https://example.com/'}]);
 assert.equal(parts.map(part=>part.text).join(''),'https://example.org/ — Fish & chips; 2 < 3.');
});

test('The rendered article links escape labels and never inject markup or handler attributes',async()=>{
 const {ArticleText}=await import('./article-text-renderer.mjs');
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const html=renderToStaticMarkup(createElement(ArticleText,{text:'<a href="https://example.com/" onclick="bad()">&lt;img src=x onerror=bad()&gt;</a><script>bad()</script>'}));
 assert.ok(html.includes('href="https://example.com/"'));assert.ok(html.includes('rel="noopener noreferrer"'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('onclick='));
});
