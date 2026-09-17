const cvPdfUrl = "/kasper-rynning-tonnesen-cv.pdf";

export function printCv() {
  let frame = document.querySelector<HTMLIFrameElement>("[data-cv-print-frame]");
  if (frame) {
    if (frame.dataset.ready !== "true") return;
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    return;
  }
  frame = document.createElement("iframe");
  frame.dataset.cvPrintFrame = "";
  frame.className = "cv-print-frame";
  frame.title = "Print curriculum vitae";
  frame.setAttribute("aria-hidden", "true");
  frame.addEventListener(
    "load",
    () => {
      frame.dataset.ready = "true";
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(cvPdfUrl, "_blank", "noopener");
      }
    },
    { once: true },
  );
  frame.src = cvPdfUrl;
  document.body.append(frame);
}
