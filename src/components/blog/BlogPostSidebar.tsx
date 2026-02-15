import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import ShareButtons from "./ShareButtons";

interface BlogPostSidebarProps {
  content: string;
  url: string;
  title: string;
  authorName?: string;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

const BlogPostSidebar = ({ content, url, title, authorName }: BlogPostSidebarProps) => {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headingElements = doc.querySelectorAll("h2, h3");
    
    const extractedHeadings: Heading[] = [];
    headingElements.forEach((heading, index) => {
      const text = heading.textContent || "";
      const id = `heading-${index}`;
      heading.id = id;
      
      extractedHeadings.push({
        id,
        text,
        level: parseInt(heading.tagName[1]),
      });
    });
    
    setHeadings(extractedHeadings);
  }, [content]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-6">
      {headings.length > 0 && (
        <Card className="p-4 sticky top-24">
          <h3 className="font-semibold text-sm mb-3">Table of Contents</h3>
          <nav className="space-y-2">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => scrollToHeading(heading.id)}
                className={`block text-left text-sm hover:text-primary transition-colors ${
                  heading.level === 3 ? "pl-4" : ""
                } text-muted-foreground hover:text-foreground`}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </Card>
      )}

      <Card className="p-4 sticky top-24">
        <ShareButtons url={url} title={title} />
      </Card>

      {authorName && (
        <Card className="p-4 sticky top-24">
          <h3 className="font-semibold text-sm mb-2">About the Author</h3>
          <p className="text-sm text-muted-foreground">
            Written by <span className="font-medium text-foreground">{authorName}</span>
          </p>
        </Card>
      )}
    </div>
  );
};

export default BlogPostSidebar;
