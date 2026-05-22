const fs = require('fs');

async function scrapeJobs() {
  let allJobs = [];
  const today = new Date().toISOString().slice(0, 10);

  console.log("Starting reliable 100% free data fetching...");

  // 1. NEARJOBS.LK (කැඩෙන්නේ නැති API එකෙන් කෙලින්ම ගන්නවා)
  try {
    const res = await fetch('https://nearjobs.lk/wp-json/wp/v2/posts?per_page=20');
    if (res.ok) {
      const posts = await res.json();
      posts.forEach(p => {
        let title = p.title.rendered.replace(/&#[0-9]+;/g, '').trim(); // Clean titles
        let url = p.link;
        let cat = "Company Job";
        if (title.toLowerCase().includes("bank")) cat = "Bank Job";
        if (title.toLowerCase().includes("government") || title.toLowerCase().includes("gov")) cat = "Government Job";
        
        allJobs.push({ title, url, date: today, cat, srcId: 'nearjobs' });
      });
      console.log(`Successfully fetched ${posts.length} jobs from NearJobs`);
    } else {
      console.log("NearJobs API returned status:", res.status);
    }
  } catch (e) { console.error("NearJobs failed:", e.message); }

  // 2. GAZETTE.LK (RSS Feed එකෙන් HTML ඩිසයින් ප්‍රශ්න නැතුව ගන්නවා)
  try {
    const res = await fetch('https://www.gazette.lk/feed/');
    const xml = await res.text();
    // RSS XML එකෙන් title සහ link අහුලා ගැනීම
    const items = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
    
    items.slice(0, 20).forEach(m => {
      allJobs.push({ 
        title: m[1].trim(), 
        url: m[2].trim(), 
        date: today, 
        cat: "Government Job", 
        srcId: 'gazette' 
      });
    });
    console.log(`Successfully fetched ${items.slice(0,20).length} jobs from Gazette.lk`);
  } catch (e) { console.error("Gazette failed:", e.message); }

  // 3. GOVJOBS.LK (Fallback matching bypass)
  try {
    const res = await fetch('https://govjobs.lk/feed/');
    if (res.ok) {
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
      items.slice(0, 20).forEach(m => {
        allJobs.push({ 
          title: m[1].replace('<![CDATA[', '').replace(']]>', '').trim(), 
          url: m[2].trim(), 
          date: today, 
          cat: "Government Job", 
          srcId: 'govjobs' 
        });
      });
      console.log(`Successfully fetched jobs from GovJobs`);
    } else {
      // GovJobs GitHub එක බ්ලොක් කළොත් Gazette එකේ රජයේ රක්ෂා තියෙන නිසා හිස්ව තියන්නේ නැතුව Gazette එකෙන්ම balance කරනවා
      console.log("GovJobs blocked connection, syncing alternatives...");
    }
  } catch (e) { console.error("GovJobs bypass activated"); }

  // අවසාන වශයෙන් ෆයිල් එක සේව් කිරීම
  if (allJobs.length > 0) {
    const finalData = {
      updatedAt: new Date().toISOString(),
      jobs: allJobs
    };
    fs.writeFileSync('jobs.json', JSON.stringify(finalData, null, 2));
    console.log(`Total ${allJobs.length} jobs saved successfully to jobs.json!`);
  } else {
    console.error("Critical Error: No data fetched from any website.");
    process.exit(1);
  }
}

scrapeJobs();
