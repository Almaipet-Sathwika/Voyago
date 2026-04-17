import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture the TicketFace component as a PDF using html2canvas and jsPDF.
 * Uses the element ID to target the specific ticket UI.
 */
export async function downloadBookingTicketPdf(booking) {
  const elementId = "voyago-ticket-capture";
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.warn(`Ticket element #${elementId} not found in DOM.`);
    return;
  }

  try {
    // 1. Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 3, // Higher resolution for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        // Ensure the cloned element for capture is visible if the original was hidden
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.display = "block";
          clonedEl.style.position = "static";
        }
      }
    });

    const imgData = canvas.toDataURL("image/png");
    
    // 2. Format PDF to match canvas aspect ratio
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Create PDF in landscape
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [imgWidth, imgHeight]
    });

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    
    // 3. Save the PDF
    const filename = `Voyago_Ticket_${String(booking._id).slice(-8)}.pdf`;
    pdf.save(filename);
    
    return true;
  } catch (err) {
    console.error("PDF download failed:", err);
    return false;
  }
}
