# PDF Generation Process Explained

This document outlines the technical process used to generate the high-quality, professional invoice PDFs in this application.

## 1. The Core Technologies
We use a **Hybrid Rendering Approach**:
*   **React (InvoiceView.tsx)**: We use React to build the invoice layout. This allows us to use modern CSS (Tailwind) for complex grids, borders, and typography that would be extremely hard to code manually in a PDF library.
*   **html2canvas**: Converts the DOM (HTML) into a high-resolution Image (PNG).
*   **jsPDF**: Takes that image and places it inside a standard PDF container.

## 2. The "Off-Screen" Capture Technique
The secret to the clean output (solving issues like "messed up text" or "dark mode artifacts") is **Isolation**.

Instead of printing what you see on the screen, we do the following in `BillingTerminal.tsx -> handlePrint`:

1.  **Create a Container**: We create a temporary `div` and attach it to the document body. We place it "off-screen" using `position: fixed` and `z-index: -9999` so the user never sees it flash.
2.  **Clone the Invoice**: We make a deep copy (`cloneNode(true)`) of the invoice element.
3.  **Enforce Print Styles**: We forcibly apply "Print Mode" styles to this clone:
    *   Background is set to pure White (`#ffffff`).
    *   Width is locked to **210mm** (A4 Paper Width).
    *   Height is set to **290mm** (A4 Height minus safety margin).
    *   Margins and Shadows are removed.
4.  **Rasterize**: `html2canvas` takes a "screenshot" of this specific container. This guarantees the image looks exactly like the design, regardless of your screen size or current browser zoom.

## 3. Smart Scaling Logic (Preventing Cut-offs)
Paper is physical and unforgiving. If an image is 298mm high, a printer will cut off the last 1mm.

We implemented a smart check:
```typescript
// Calculate aspect ratio
const imgWidth = 210; // A4 Width
const imgHeight = (canvas.height * imgWidth) / canvas.width;
const pageHeight = 297; // A4 Height

// Logic
if (imgHeight > pageHeight) {
    // CONTENT IS TOO LONG!
    // Instead of cropping, we shrink the image slightly to fit.
    finalHeight = pageHeight;
    finalWidth = (pageHeight * canvas.width) / canvas.height;
}

// Center the slightly shrunken image on the page
pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
```
This ensures that even if the invoice is *just slightly* too tall (e.g., due to a long description), it shrinks by 1-2% so the footer fits perfectly.

## 4. Layout Structure (`InvoiceView.tsx`)
The layout is built using **Tailwind CSS Flexbox and Grid**:
*   **A4 Aspect Ratio**: The main container is styled with `width: 210mm` and `min-height: 290mm`.
*   **Pagination**: We split items into chunks of 10 (`ITEMS_PER_PAGE`). If an invoice has 15 items, React creates 2 pages loop `pages.map(...)`.
*   **Fixed Heights**: Critical sections (Header and Footer) have stable layouts, while the middle "Items Table" grows dynamically.

## Summary
1.  **User clicks "Download PDF"**.
2.  App creates a **Hidden, Perfect White A4 Canvas**.
3.  App **Draws** the Invoice onto it.
4.  App **Snaps a Picture** of the canvas.
5.  App **Pastes** the picture into a PDF file.
6.  PDF downloads.
