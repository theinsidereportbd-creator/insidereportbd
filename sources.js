// খবরের সোর্স তালিকা (শুধু যাদের ফিড পরীক্ষা করে কাজ করছে পাওয়া গেছে)।
// নতুন সোর্স যোগ করতে একটি লাইন কপি করে নাম ও RSS লিংক বদলান,
// এবং worker.js-এর SOURCES তালিকায়ও একই id ও লিংক যোগ করুন।
window.SOURCES = [
  { id: "prothomalo", name: "প্রথম আলো",   url: "https://www.prothomalo.com/feed/",                    color: "#d32f2f", type: "news" },
  { id: "dailystar",  name: "ডেইলি স্টার", url: "https://www.thedailystar.net/taxonomy/term/1/rss.xml", color: "#1565c0", type: "news" },
  { id: "jagonews24", name: "জাগো নিউজ",  url: "https://www.jagonews24.com/rss/rss.xml",              color: "#2e7d32", type: "news" },
  { id: "tirbd",       name: "The Inside Report BD", url: "https://theinsidereportbd.blogspot.com/feeds/posts/default?alt=rss", color: "#f5c542", type: "news" },
  { id: "ajkerpatrika", name: "আজকের পত্রিকা", url: "https://www.ajkerpatrika.com/feed/",            color: "#ef6c00", type: "news" },
  { id: "bdjournal",   name: "বাংলাদেশ জার্নাল", url: "https://www.bd-journal.com/feed/latest-rss.xml", color: "#6a1b9a", type: "news" },
  { id: "bd24live",    name: "বিডি২৪ লাইভ", url: "https://www.bd24live.com/bangla/feed/",              color: "#00838f", type: "news" },
  { id: "aljazeera",   name: "আল জাজিরা (ইংরেজি)", url: "https://www.aljazeera.com/xml/rss/all.xml",    color: "#b8860b", type: "news" }
];
