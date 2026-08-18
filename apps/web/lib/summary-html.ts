const BR = String.raw`<br\s*\/?>`;

/**
 * Cleans model-emitted spacing artifacts out of sanitized summary_html
 * before it renders. The pipeline's output template separates sections
 * with `<br><hr><br>` and sprinkles stray breaks between blocks; those
 * stack with heading margins into big blank gaps.
 */
export function normalizeSummaryHtml(html: string): string {
  return (
    html
      // divider groups: an <hr> and any breaks hugging it
      .replace(new RegExp(String.raw`\s*(?:${BR}\s*)*<hr[^>]*>(?:\s*${BR})*\s*`, "gi"), "")
      // breaks between blocks (whitespace does the separating there);
      // breaks inside paragraphs stay, they are real line breaks
      .replace(new RegExp(String.raw`(?:${BR}\s*)+(?=<(?:h[1-6]|p|ul|ol|div)\b)`, "gi"), "")
      .replace(new RegExp(String.raw`(<\/(?:h[1-6]|p|ul|ol|div)>)\s*(?:${BR}\s*)+`, "gi"), "$1")
      // paragraphs holding nothing (or only whitespace/&nbsp;/breaks)
      .replace(new RegExp(String.raw`<p>(?:\s|&nbsp;| |${BR})*<\/p>`, "gi"), "")
      // any remaining runs of breaks collapse to one
      .replace(new RegExp(String.raw`(?:${BR}\s*){2,}`, "gi"), "<br />")
  );
}
