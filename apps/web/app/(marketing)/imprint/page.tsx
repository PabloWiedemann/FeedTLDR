import type { Metadata } from "next";

export const metadata: Metadata = { title: "Imprint" };

export default function ImprintPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-6 pb-24">
      <h1 className="mb-8 text-4xl font-semibold">Imprint</h1>
      <div className="flex max-w-[65ch] flex-col gap-6">
        <section>
          <h2 className="mb-2 text-lg font-medium">Tori Technologies Inc.</h2>
          <p className="text-muted-foreground">
            1055 Dunsmuir Street, Suite 3000
            <br />
            Vancouver, British Columbia, Canada V7X 1K8
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-medium">Contact</h2>
          <p className="text-muted-foreground">Email: info@toriml.com</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-medium">Authorized representatives</h2>
          <p className="text-muted-foreground">
            Pablo Wiedemann
            <br />
            Simon Wiedemann
          </p>
        </section>
      </div>
    </main>
  );
}
