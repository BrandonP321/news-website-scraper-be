import express, { Request } from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/", async (req, res) => {
  try {
    const { url } = req.body as { url: string };

    console.log(url);

    try {
      // 1) Fetch the raw HTML
      const { data: html } = await axios.get(url);

      // 2) Parse with Cheerio
      const $ = cheerio.load(html);

      // 1) Article title: <h1 class="Page-headline">
      const title = $("h1.Page-headline").text().trim() || "";

      // 2) Authors: Each <span class="Link"> inside <div class="Page-authors">
      //    We'll collect them into an array of strings
      const authors: string[] = [];
      $("div.Page-authors span.Link").each((_, el) => {
        const authorName = $(el).text().trim();
        if (authorName) {
          authors.push(authorName);
        }
      });

      // 3) Article content: All <p> that are *direct children* of
      //    <div class="RichTextStoryBody RichTextBody">
      //    Then join them into one single string.
      let content = "";
      $("div.RichTextStoryBody.RichTextBody > p").each((_, el) => {
        content += $(el).text().trim() + "\n";
      });
      content = content.trim();

      // 4) Published date: <div class="Page-dateModified"> -> <span data-date>
      //    We'll get the 'data-date' attribute
      let publishedDate = "";
      const dateSpan = $("div.Page-dateModified span[data-date]");
      if (dateSpan.length > 0) {
        publishedDate = dateSpan.attr("data-date")?.trim() || "";
      }

      // Send JSON response
      res
        .json({
          title,
          authors,
          content,
          publishedDate,
        })
        .end();
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Error scraping the URL." }).end();
    }
  } catch (error) {
    console.log(error);

    res.status(500).send("Internal Server Error").end();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
