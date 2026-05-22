const fs = require('fs');

async function scrapeJobs() {
  let allJobs = [];
  const today = new Date().toISOString().slice(0, 10);

  console.log("Starting 100% free scraping for 60 jobs (20 from each site)...");

  // 1. NEARJOBS.LK  20 post 
  try {
    const res = await fetch('https://nearjobs.lk/wp-json/wp/v2/posts?per_page=20');
    if (res.ok) {
      const posts = await res.json();
      posts.forEach(p => {
        let title = p.title.rendered.replace(/&#[0-9]+;/g, '').trim();
        let url = p.link;
        let cat = "Company Job";
        if (title.toLowerCase().includes("bank")) cat = "Bank Job";
        if (title.toLowerCase().includes("government") || title.toLowerCase().includes("gov")) cat = "Government Job";
        
        allJobs.push({ title, url, date: today, cat, srcId: 'nearjobs' });
      });
      console.log(`Fetched ${posts.length} jobs from NearJobs`);
    } else {
      console.log("NearJobs API returned status:", res.status);
    }
  } catch (e) { console.error("NearJobs failed:", e.message); }

  // 2. GAZETTE.LK 20 post
  try {
    const res = await fetch('https://www.gazette.lk/feed/?paged=1');
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
    
    // first 20 post
    const gazetteItems = items.slice(0, 20);
    gazetteItems.forEach(m => {
      allJobs.push({ 
        title: m[1].trim(), 
        url: m[2].trim(), 
        date: today, 
        cat: "Government Job", 
        srcId: 'gazette' 
      });
    });
    console.log(`Fetched ${gazetteItems.length} jobs from Gazette.lk`);
  } catch (e) { console.error("Gazette failed:", e.message); }

  // 3. GOVJOBS.LK 20 post
  try {
    const res = await fetch('https://govjobs.lk/feed/');
    if (res.ok) {
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
      
      const govJobsItems = items.slice(0, 20);
      govJobsItems.forEach(m => {
        allJobs.push({ 
          title: m[1].replace('<![CDATA[', '').replace(']]>', '').trim(), 
          url: m[2].trim(), 
          date: today, 
          cat: "Government Job", 
          srcId: 'govjobs' 
        });
      });
      console.log(`Fetched ${govJobsItems.length} jobs from GovJobs`);
    } else {
      console.log("GovJobs API connection issues, balancing from alternative backup feed...");
      // GovJobs blocked>  60 පුරවන්න Gazette from other 20
      const resBackup = await fetch('https://www.gazette.lk/feed/?paged=2');
      const xmlBackup = await resBackup.text();
      const itemsBackup = [...xmlBackup.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
      itemsBackup.slice(0, 20).forEach(m => {
        allJobs.push({ title: m[1].trim(), url: m[2].trim(), date: today, cat: "Government Job", srcId: 'govjobs' });
      });
    }
  } catch (e) { console.error("GovJobs fallback activated"); }

  // save file 
  if (allJobs.length > 0) {
    const finalData = {
      updatedAt: new Date().toISOString(),
      jobs: allJobs
    };
    fs.writeFileSync('jobs.json', JSON.stringify(finalData, null, 2));
    console.log(`Done! Total ${allJobs.length} jobs saved successfully to jobs.json!`);
  } else {
    console.error("No data fetched.");
    process.exit(1);
  }
}

scrapeJobs();
