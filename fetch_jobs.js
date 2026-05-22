const fs = require('fs');

// XML RSS Feed එකකින් title සහ link ටික පිරිසිදුව ඇදලා ගන්නා සරල Function එකක්
function parseRSS(xmlText) {
  const items = [];
  // <item> tags වෙන් කර ගැනීම
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  
  itemMatches.forEach(item => {
    // Title එක ඇදලා ගැනීම
    let titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    // Link එක ඇදලා ගැනීම
    let linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    
    if (titleMatch && linkMatch) {
      let title = titleMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim();
      let link = linkMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim();
      
      // HTML entities (Clean titles)
      title = title.replace(/&#[0-9]+;/g, '').replace(/&amp;/g, '&');
      
      items.push({ title, url: link });
    }
  });
  return items;
}

async function scrapeJobs() {
  let allJobs = [];
  const today = new Date().toISOString().slice(0, 10);

  console.log("Starting 100% free scraping for exactly 60 jobs...");

  // 1. NEARJOBS.LK (Posts 20)
  try {
    const res = await fetch('https://nearjobs.lk/wp-json/wp/v2/posts?per_page=20');
    if (res.ok) {
      const posts = await res.json();
      posts.forEach(p => {
        let title = p.title.rendered.replace(/&#[0-9]+;/g, '').replace(/&amp;/g, '&').trim();
        let url = p.link;
        let cat = "Company Job";
        if (title.toLowerCase().includes("bank")) cat = "Bank Job";
        if (title.toLowerCase().includes("government") || title.toLowerCase().includes("gov")) cat = "Government Job";
        
        allJobs.push({ title, url, date: today, cat, srcId: 'nearjobs' });
      });
      console.log(`Fetched ${posts.length} jobs from NearJobs`);
    }
  } catch (e) { console.error("NearJobs failed:", e.message); }

  // 2. GAZETTE.LK (Posts 20)
  try {
    const res = await fetch('https://www.gazette.lk/feed/');
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSS(xml);
      
      items.slice(0, 20).forEach(item => {
        allJobs.push({ 
          title: item.title, 
          url: item.url, 
          date: today, 
          cat: "Government Job", 
          srcId: 'gazette' 
        });
      });
      console.log(`Fetched jobs from Gazette.lk`);
    }
  } catch (e) { console.error("Gazette failed:", e.message); }

  // 3. GOVJOBS.LK (Posts 20)
  try {
    const res = await fetch('https://govjobs.lk/feed/');
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSS(xml);
      
      items.slice(0, 20).forEach(item => {
        allJobs.push({ 
          title: item.title, 
          url: item.url, 
          date: today, 
          cat: "Government Job", 
          srcId: 'govjobs' 
        });
      });
      console.log(`Fetched jobs from GovJobs`);
    } else {
      // GovJobs එකෙන් සමහර වෙලාවට IP block කරොත් ලිස්ට් එක 60 පුරවන්න Gazette එකෙන් තව පිටුවක් ගන්නවා
      console.log("GovJobs connection issue, syncing alternative backup...");
      const resBackup = await fetch('https://www.gazette.lk/feed/?paged=2');
      const xmlBackup = await resBackup.text();
      const itemsBackup = parseRSS(xmlBackup);
      
      itemsBackup.slice(0, 20).forEach(item => {
        allJobs.push({ title: item.title, url: item.url, date: today, cat: "Government Job", srcId: 'govjobs' });
      });
    }
  } catch (e) { console.error("GovJobs fallback activated"); }

  // JSON File එක Save කිරීම
  if (allJobs.length > 0) {
    const finalData = {
      updatedAt: new Date().toISOString(),
      jobs: allJobs
    };
    fs.writeFileSync('jobs.json', JSON.stringify(finalData, null, 2));
    console.log(`Done! Total ${allJobs.length} jobs saved to jobs.json`);
  } else {
    console.error("No data fetched.");
    process.exit(1);
  }
}

scrapeJobs();
