import { safeWrap } from "../wrap";

const cvPdfUrl = "/kasper-rynning-tonnesen-cv.pdf";

function printFrame(frame: HTMLIFrameElement) {
  const content = frame.contentWindow;
  if (!content) {
    window.open(cvPdfUrl, "_blank", "noopener");
    return;
  }
  const [error] = safeWrap(() => {
    content.focus();
    content.print();
  });
  if (error) {
    console.warn(new Error("Could not print the CV in its frame", { cause: error }));
    window.open(cvPdfUrl, "_blank", "noopener");
  }
}

export function printCv() {
  let frame = document.querySelector<HTMLIFrameElement>("[data-cv-print-frame]");
  if (frame) {
    if (frame.dataset.ready !== "true") {
      return;
    }
    printFrame(frame);
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
      printFrame(frame);
    },
    { once: true },
  );
  frame.src = cvPdfUrl;
  document.body.append(frame);
}
