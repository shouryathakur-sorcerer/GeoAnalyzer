const axios = require('axios');
const xml2js = require('xml2js');

// Lightweight backend NLP logic
function analyzeThreat(country, articles) {
  if (!articles || articles.length === 0) return { defcon: 5, summary: "Nominal status. No threats detected." };
  
  const textCorpus = articles.map(a => a.title.toLowerCase()).join(" ");
  let score = 0;
  
  ['attack', 'war', 'missile', 'strike', 'crisis'].forEach(k => { if(textCorpus.includes(k)) score += 30; });
  ['tension', 'military', 'conflict', 'threat'].forEach(k => { if(textCorpus.includes(k)) score += 15; });
  
  if (score > 60) return { defcon: 1, summary: `CRITICAL ALERT: High probability of exchange involving ${country}.` };
  if (score > 30) return { defcon: 3, summary: `ELEVATED TENSION: Significant friction detected in ${country}.` };
  return { defcon: 4, summary: `Routine geopolitical activity in ${country}.` };
}

async function fetchNewsForCountry(country) {
  try {
    const query = encodeURIComponent(`"${country}" (military OR conflict OR news)`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US`;
    
    const response = await axios.get(url);
    const result = await xml2js.parseStringPromise(response.data);
    
    let articles = [];
    if (result.rss && result.rss.channel[0].item) {
      articles = result.rss.channel[0].item.slice(0, 5).map(item => ({
        title: item.title[0],
        link: item.link[0],
        pubDate: item.pubDate[0]
      }));
    }

    const threatAnalysis = analyzeThreat(country, articles);

    return {
      country,
      defcon: threatAnalysis.defcon,
      summary: threatAnalysis.summary,
      articles
    };
  } catch (error) {
    console.error("News fetch error:", error);
    return { country, defcon: 5, summary: "Uplink failed.", articles: [] };
  }
}

module.exports = { fetchNewsForCountry };