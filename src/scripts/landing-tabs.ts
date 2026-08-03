/*
  Inquiry-type tabs on the contact form. No GSAP dependency — if the motion bundle
  fails this still has to work, because the tab is what tells us what the message
  is about.

  The markup ships with Product pre-selected and matching hidden fields, so the
  form submits correctly even if this never runs.
*/

const SUBJECTS: Record<string, string> = {
  Product: "New product inquiry — Essenly",
  Wholesale: "New wholesale inquiry — Essenly",
  Other: "New inquiry — Essenly",
};

export function initLandingTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".l-tab"));
  if (tabs.length === 0) return;

  const typeField = document.getElementById("l-form-type") as HTMLInputElement | null;
  const subjectField = document.getElementById("l-form-subject") as HTMLInputElement | null;
  const company = document.getElementById("l-company") as HTMLInputElement | null;
  const companyLabel = document.getElementById("l-company-label");

  function select(tab: HTMLButtonElement): void {
    const value = tab.dataset.tab ?? "Product";
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    if (typeField) typeField.value = value;
    if (subjectField) subjectField.value = SUBJECTS[value] ?? SUBJECTS.Other;

    /* A wholesale enquiry without a company name cannot be quoted, which is the
       one extra field the old wholesale form asked for. */
    const wholesale = value === "Wholesale";
    if (company) company.required = wholesale;
    if (companyLabel) companyLabel.textContent = wholesale ? "Company *" : "Company";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });

  /* Deep links into the wholesale tab, e.g. the Wholesale section's CTA. */
  document.querySelectorAll<HTMLAnchorElement>('a[data-tab][href="#contact"]').forEach((link) => {
    link.addEventListener("click", () => {
      const wanted = tabs.find((t) => t.dataset.tab === link.dataset.tab);
      if (wanted) select(wanted);
    });
  });
}
