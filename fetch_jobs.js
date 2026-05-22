const fs = require('fs');

async function scrapeJobs() {
  let allJobs = [];
  const today = new Date().toISOString().slice(0, 10);

  console.log("Starting 100% free web scraping...");

  // 1. NEARJOBS.LK SCRAPER
  try {
    const res = await fetch('https://nearjobs.lk/');
    const html = await res.text();
    const matches = [...html.matchAll(/<h3[^>]*class="[^"]*entry-title[^"]*"[^>]*><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/g)];
    
    matches.slice(0, 20).forEach(m => {
      let title = m[2].trim();
      let url = m[1];
      let cat = "Company job";
      if(title.toLowerCase().includes("bank")) cat = "Bank job";
      if(title.toLowerCase().includes("gov") || title.toLowerCase().includes("officer")) cat = "Government job";
      
      allJobs.push({ title, url, date: today, cat, srcId: 'nearjobs' });
    });
    console.log(`Scraped ${matches.slice(0,20).length} jobs from NearJobs`);
  } catch (e) { console.error("NearJobs failed:", e.message); }

  // 2. GAZETTE.LK SCRAPER
  try {
    const res = await fetch('https://www.gazette.lk/');
    const html = await res.text();
    const matches = [...html.matchAll(/<h2[^>]*class="[^"]*post-title[^"]*"[^>]*><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g)];
    
    matches.slice(0, 20).forEach(m => {
      let title = m[2].replace(/<[^>]*>/g, '').trim();
      allJobs.push({ title, url: m[1], date: today, cat: "Government job", srcId: 'gazette' });
    });
    console.log(`Scraped ${matches.slice(0,20).length} jobs from Gazette.lk`);
  } catch (e) { console.error("Gazette failed:", e.message); }

  // 3. GOVJOBS.LK SCRAPER
  try {
    const res = await fetch('https://govjobs.lk/');
    const html = await res.text();
    const matches = [...html.matchAll(/<a\s+class="[^"]*job-title[^"]*"[^+]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    
    if(matches.length === 0) {
      const altMatches = [...html.matchAll(/href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
      altMatches.filter(m => m[1].includes('/job/')).slice(0, 20).forEach(m => {
        allJobs.push({ title: m[2].trim(), url: m[1], date: today, cat: "Government job", srcId: 'govjobs' });
      });
    } else {
      matches.slice(0, 20).forEach(m => {
        allJobs.push({ title: m[2].trim(), url: m[1], date: today, cat: "Government job", srcId: 'govjobs' });
      });
    }
    console.log(`Scraped jobs from GovJobs`);
  } catch (e) { console.error("GovJobs failed:", e.message); }

  if (allJobs.length > 0) {
    const finalData = {
      updatedAt: new Date().toISOString(),
      jobs: allJobs
    };
    fs.writeFileSync('jobs.json', JSON.stringify(finalData, null, 2));
    console.log(`Total ${allJobs.length} jobs saved successfully!`);
  } else {
    console.error("No jobs could be scraped.");
    process.exit(1);
  }
}

scrapeJobs();
